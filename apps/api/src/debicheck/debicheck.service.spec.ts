import { BadRequestException } from '@nestjs/common';
import { DebicheckService } from './debicheck.service';
import type { MandateInitiationDto } from './dto/debicheck.dto';

describe('DebicheckService mandate initiation', () => {
    const client = { id: 'client-1', debiCheckMandateId: null };
    const repository = {
        findOne: jest.fn(),
        save: jest.fn(),
    };
    const config = {
        get: jest.fn((key: string) => {
            const values: Record<string, string> = {
                NUPAY_USERNAME: 'test-user',
                NUPAY_PASSWORD: 'test-password',
                NUPAY_CARD_ACCEPTOR: '000000000000001',
                NUPAY_BASE_URL: 'https://nupay.example.test',
            };
            return values[key];
        }),
    };
    const request: MandateInitiationDto = {
        clientId: 'client-1',
        frequency: 'MNTH',
        collectionDay: '25',
        startDate: '2026-12-25',
        dateAdjustmentRule: 'Y',
        clientReference: 'QFN000023',
        contractReference: 'QFN000023AD',
        instalments: '360',
        trackingIndicator: '00',
        instalmentAmount: '2000.00',
        maxCollectionAmount: '2000.00',
        adjustmentCategory: 'N',
        debitValueTypeId: '1',
        entryClass: '0033',
        debtorName: 'Naledi Mokoena',
        debtorIdType: '2',
        debtorId: '9001015009087',
        debtorAccountNumber: '1234567890',
        debtorAccountType: '02',
        debtorBankId: '3',
        debtorBranchNumber: '250655',
        debtorPhoneNumber: '0821234567',
        debtorEmail: 'naledi@example.test',
    };

    let service: DebicheckService;
    let post: jest.Mock;

    beforeEach(() => {
        jest.clearAllMocks();
        service = new DebicheckService(config as never, repository as never);
        post = jest.fn();
        Object.defineProperty(service, 'http', { value: { post } });
    });

    it('rejects a NuPay business failure even when the HTTP request succeeds', async () => {
        post.mockResolvedValue({
            data: { ResultCode: '500100', Status: 'Invalid mandate data' },
        });

        await expect(service.initiateMandate(request)).rejects.toThrow(BadRequestException);
        expect(repository.save).not.toHaveBeenCalled();
    });

    it('persists the mandate ID only after NuPay returns result code 500000', async () => {
        post.mockResolvedValue({
            data: {
                ResultCode: '500000',
                Status: 'Successful',
                referenceNumbers: { mandateID: 'MANDATE-1' },
            },
        });
        repository.findOne.mockResolvedValue(client);
        repository.save.mockResolvedValue(client);

        await expect(service.initiateMandate(request)).resolves.toEqual(
            expect.objectContaining({ ResultCode: '500000' })
        );
        expect(repository.save).toHaveBeenCalledWith(
            expect.objectContaining({ debiCheckMandateId: 'MANDATE-1' })
        );
    });
});
