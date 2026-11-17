import { describe, expect, it, vi } from 'vitest';

vi.stubEnv('VITE_API_URL', 'http://localhost:2200/api');

describe('clientSchema regression', () => {
    it('normalises legacy numeric strings while preserving explicit null collections', async () => {
        const { clientSchema } = await import('../clients.api');
        const client = clientSchema.parse({
            id: '46a4d384-ea07-43bc-9545-9b0e84fcc787',
            fileReference: null,
            idNumber: '8809055641084',
            firstName: 'Onkarabile',
            lastName: 'Mulaudzi',
            email: 'client@example.com',
            phoneNumber: '0821234567',
            dateOfBirth: '1988-09-05',
            maritalStatus: '',
            clientType: '',
            physicalAddress: 'Pretoria',
            monthlyIncome: '12000',
            monthlyExpenses: '7000',
            totalDebt: '25000',
            status: 'active',
            documentsRequired: null,
            documentsReceived: null,
            createdAt: '2026-11-15T08:00:00.000Z',
            updatedAt: '2026-11-15T08:00:00.000Z',
        });

        expect(client.monthlyIncome).toBe(12000);
        expect(client.clientType).toBe('individual');
        expect(client.maritalStatus).toBeNull();
        expect(client.documentsRequired).toBeNull();
    });

    it.each([
        [1, true],
        [0, false],
        ['1', true],
        ['0', false],
        [true, true],
        [false, false],
    ])('normalises database consent value %p to %p', async (storedValue, expected) => {
        const { clientSchema } = await import('../clients.api');
        const client = clientSchema.parse({
            id: '46a4d384-ea07-43bc-9545-9b0e84fcc787',
            idNumber: '8809055641084',
            firstName: 'Onkarabile',
            lastName: 'Mulaudzi',
            email: 'client@example.com',
            phoneNumber: '0821234567',
            dateOfBirth: '1988-09-05',
            physicalAddress: 'Pretoria',
            monthlyIncome: 12000,
            monthlyExpenses: 7000,
            totalDebt: 25000,
            status: 'active',
            debiCheckConsentGiven: storedValue,
            createdAt: '2026-11-15T08:00:00.000Z',
            updatedAt: '2026-11-15T08:00:00.000Z',
        });

        expect(client.debiCheckConsentGiven).toBe(expected);
    });
});
