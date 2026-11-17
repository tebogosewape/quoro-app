import { apiClient } from '@/api/axios.config';
import type { Client } from '@/api/clients.api';
import type { PricingOptions } from '@/interfaces/Product';

export type MandateProduct = {
    id: string;
    code: string;
    name: string;
    requires_mandate: boolean;
    pricing_options?: PricingOptions;
};

export type MandateSelection = {
    productId: string;
    paymentOptionId: string;
};

type MandateInitiationResponse = {
    referenceNumbers?: {
        mandateRequestTranId?: string;
        clientReference?: string;
        mandateID?: string;
        contractReference?: string;
    };
    mandate_id?: string;
    Status?: string;
    ResultCode?: string;
};

export type MandateHandoffResult = {
    mandateStatus: 'pending' | 'pending_auth';
    mandateId?: string;
    mandateReference?: string;
    mandateRequestTranId?: string;
    mandateError?: string;
    mandateAttemptedAt: string;
    mandateCollectionDay: string;
};

const bankIds: Array<[RegExp, string]> = [
    [/standard/i, '1'],
    [/nedbank/i, '2'],
    [/(first national|\bfnb\b)/i, '3'],
    [/capitec/i, '10'],
    [/absa/i, '16'],
    [/tyme/i, '61'],
    [/discovery/i, '63'],
    [/old mutual/i, '67'],
];

const resolveBankId = (bankName?: string | null) =>
    bankIds.find(([pattern]) => pattern.test(bankName || ''))?.[1];

const resolveAccountType = (accountType?: string | null) => {
    const value = (accountType || '').toLowerCase();
    if (value.includes('saving')) return '02';
    if (value.includes('transmission')) return '03';
    if (value.includes('current') || value.includes('cheque') || value.includes('check')) {
        return '01';
    }
    return undefined;
};

const resolvePayment = (product: MandateProduct, paymentOptionId: string) => {
    const pricing = product.pricing_options;
    if (paymentOptionId.endsWith('_once_off') && pricing?.oneOff) {
        return { amount: pricing.oneOff, instalments: 1 };
    }

    const instalmentMatch = paymentOptionId.match(/_inst_(\d+)$/);
    if (instalmentMatch) {
        const count = Number(instalmentMatch[1]);
        const option = pricing?.instalments?.find((item) => item.count === count);
        if (option) return { amount: option.amount, instalments: option.count };
    }

    if (paymentOptionId.includes('_recurring')) {
        const amount = pricing?.minimumAmount;
        if (amount) return { amount, instalments: 360 };
    }

    const fallbackAmount =
        pricing?.oneOff || pricing?.minimumAmount || pricing?.instalments?.[0]?.amount;
    if (!fallbackAmount) return undefined;
    return {
        amount: fallbackAmount,
        instalments: pricing?.instalments?.[0]?.count || 1,
    };
};

const futureCollectionDate = (collectionDay: string, firstPaymentMonth?: string | null) => {
    const now = new Date();
    const monthsAhead = firstPaymentMonth === 'third' ? 3 : firstPaymentMonth === 'second' ? 2 : 1;
    const year = now.getFullYear();
    const month = now.getMonth() + monthsAhead;
    const lastDay = new Date(year, month + 1, 0).getDate();
    const requestedDay = collectionDay === '99' ? lastDay : Number(collectionDay);
    const date = new Date(year, month, Math.min(Math.max(requestedDay, 1), lastDay));
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
};

const providerData = <T>(value: unknown): T => {
    const candidate = value as { data?: T };
    return (candidate?.data ?? value) as T;
};

export async function attemptNuPayMandate({
    client,
    product,
    selection,
    collectionDay,
}: {
    client: Client;
    product: MandateProduct;
    selection: MandateSelection;
    collectionDay: string;
}): Promise<MandateHandoffResult> {
    const attemptedAt = new Date().toISOString();
    const contractReference = `${client.fileReference || 'QF'}${product.code}`
        .replace(/[^a-z0-9]/gi, '')
        .slice(0, 14);

    try {
        const bankId = resolveBankId(client.bankName);
        const accountType = resolveAccountType(client.accountType);
        const payment = resolvePayment(product, selection.paymentOptionId);
        if (!bankId) throw new Error(`Unsupported NuPay bank mapping: ${client.bankName || 'missing'}`);
        if (!accountType) {
            throw new Error(`Unsupported NuPay account type: ${client.accountType || 'missing'}`);
        }
        if (!payment) throw new Error('The selected payment option has no NuPay amount mapping');
        if (!client.accountHolder || !client.accountNumber || !client.branchCode) {
            throw new Error('Client banking details are incomplete');
        }

        const clientReference = (client.fileReference || client.id).replace(/[^a-z0-9-]/gi, '').slice(0, 35);
        const amount = payment.amount.toFixed(2);

        const response = await apiClient.post('/debicheck/mandate/initiate', {
            clientId: client.id,
            frequency: 'MNTH',
            collectionDay: collectionDay.padStart(2, '0'),
            startDate: futureCollectionDate(
                collectionDay,
                client.paymentInfo?.firstPaymentMonth
            ),
            dateAdjustmentRule: 'Y',
            clientReference,
            contractReference,
            instalments: String(payment.instalments),
            trackingIndicator: '00',
            instalmentAmount: amount,
            maxCollectionAmount: amount,
            adjustmentCategory: 'N',
            debitValueTypeId: '1',
            entryClass: '0033',
            debtorName: client.accountHolder.slice(0, 30),
            debtorIdType: '2',
            debtorId: client.idNumber,
            debtorAccountNumber: client.accountNumber.replace(/\s+/g, ''),
            debtorAccountType: accountType,
            debtorBankId: bankId,
            debtorBranchNumber: client.branchCode.replace(/\s+/g, ''),
            debtorPhoneNumber: client.phoneNumber,
            debtorEmail: client.email,
            loadType: '1',
            nonWarehouseMandate: '0',
            smsOptIn: 'N',
        });

        const result = providerData<MandateInitiationResponse>(response.data);
        if (result.ResultCode !== '500000') {
            throw new Error(
                `NuPay rejected mandate initiation (${result.ResultCode || 'unknown result code'})`
            );
        }

        const mandateId = result.referenceNumbers?.mandateID || result.mandate_id;
        if (!mandateId) throw new Error('NuPay accepted the request without returning a mandate ID');

        return {
            mandateStatus: 'pending_auth',
            mandateId,
            mandateReference: result.referenceNumbers?.contractReference,
            mandateRequestTranId: result.referenceNumbers?.mandateRequestTranId,
            mandateAttemptedAt: attemptedAt,
            mandateCollectionDay: collectionDay,
        };
    } catch (error) {
        const providerMessage = (
            error as { response?: { data?: { message?: string | string[] } } }
        )?.response?.data?.message;
        const mandateError = Array.isArray(providerMessage)
            ? providerMessage.join('; ')
            : providerMessage ||
              (error instanceof Error ? error.message : 'NuPay mandate initiation failed');
        return {
            mandateStatus: 'pending',
            mandateReference: contractReference,
            mandateError,
            mandateAttemptedAt: attemptedAt,
            mandateCollectionDay: collectionDay,
        };
    }
}
