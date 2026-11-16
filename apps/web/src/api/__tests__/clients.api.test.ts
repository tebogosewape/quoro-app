import { describe, expect, it, vi } from 'vitest';

vi.stubEnv('VITE_API_URL', 'http://localhost:2200/api');

describe('createClientDtoSchema', () => {
    it('accepts a valid South African client and normalises the email address', async () => {
        const { createClientDtoSchema } = await import('../clients.api');
        const result = createClientDtoSchema.parse({
            idNumber: '8809055641084',
            firstName: 'Onkarabile',
            lastName: 'Mulaudzi',
            email: 'CLIENT@EXAMPLE.COM',
            phoneNumber: '0821234567',
            dateOfBirth: '1988-09-05',
            maritalStatus: 'single',
            clientType: 'individual',
            physicalAddress: 'Pretoria',
            monthlyIncome: 12000,
            monthlyExpenses: 7000,
            totalDebt: 25000,
        });

        expect(result.email).toBe('client@example.com');
    });

    it('rejects an invalid South African ID number', async () => {
        const { createClientDtoSchema } = await import('../clients.api');
        const result = createClientDtoSchema.safeParse({
            idNumber: '1234',
            firstName: 'Valid',
            lastName: 'Client',
            email: 'client@example.com',
            phoneNumber: '0821234567',
            dateOfBirth: '1988-09-05',
            maritalStatus: 'single',
            clientType: 'individual',
            physicalAddress: 'Pretoria',
            monthlyIncome: 12000,
            monthlyExpenses: 7000,
            totalDebt: 25000,
        });

        expect(result.success).toBe(false);
    });
});
