import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Client } from '@/api/clients.api';

const { postMock } = vi.hoisted(() => ({ postMock: vi.fn() }));

vi.mock('@/api/axios.config', () => ({
    apiClient: { post: postMock },
}));

import { attemptNuPayMandate } from '@/api/debicheck.api';

const client = {
    id: 'client-1',
    fileReference: 'QFN000023',
    firstName: 'Naledi',
    lastName: 'Mokoena',
    idNumber: '9001015009087',
    phoneNumber: '0821234567',
    email: 'naledi@example.test',
    bankName: 'FNB',
    accountType: 'savings',
    accountHolder: 'Naledi Mokoena',
    accountNumber: '1234567890',
    branchCode: '250655',
    paymentInfo: { firstPaymentMonth: 'first', selectedPaymentOptions: {} },
} as Client;

const product = {
    id: 'product-1',
    code: 'AD',
    name: 'Affordable Distribution',
    requires_mandate: true,
    pricing_options: { minimumAmount: 2000 },
};

const request = {
    client,
    product,
    selection: { productId: 'product-1', paymentOptionId: 'product-1_recurring' },
    collectionDay: '25',
};

describe('attemptNuPayMandate', () => {
    beforeEach(() => postMock.mockReset());

    it('returns pending authorisation only for NuPay success code 500000', async () => {
        postMock.mockResolvedValue({
            data: {
                ResultCode: '500000',
                referenceNumbers: {
                    mandateID: 'MANDATE-1',
                    contractReference: 'QFN000023AD',
                    mandateRequestTranId: 'REQUEST-1',
                },
            },
        });

        const result = await attemptNuPayMandate(request);

        expect(postMock).toHaveBeenCalledWith(
            '/debicheck/mandate/initiate',
            expect.objectContaining({
                clientId: 'client-1',
                collectionDay: '25',
                instalmentAmount: '2000.00',
                debtorBankId: '3',
                debtorAccountType: '02',
            })
        );
        expect(result).toEqual(
            expect.objectContaining({
                mandateStatus: 'pending_auth',
                mandateId: 'MANDATE-1',
                mandateReference: 'QFN000023AD',
                mandateRequestTranId: 'REQUEST-1',
            })
        );
    });

    it('keeps the mandate pending when NuPay returns an HTTP success with a rejection code', async () => {
        postMock.mockResolvedValue({
            data: { ResultCode: '500100', Status: 'Invalid mandate data' },
        });

        await expect(attemptNuPayMandate(request)).resolves.toEqual(
            expect.objectContaining({
                mandateStatus: 'pending',
                mandateError: 'NuPay rejected mandate initiation (500100)',
                mandateCollectionDay: '25',
            })
        );
    });

    it('keeps the mandate pending when the provider request times out', async () => {
        postMock.mockResolvedValue({
            get data() {
                throw new Error('timeout of 10000ms exceeded');
            },
        });

        const result = await attemptNuPayMandate(request);
        expect(result).toEqual(
            expect.objectContaining({
                mandateStatus: 'pending',
                mandateError: 'timeout of 10000ms exceeded',
            })
        );
    });
});
