import { ClientsService } from './clients.service';
import { ClientStatus } from '@/entities/client.entity';
import { BadRequestException } from '@nestjs/common';

describe('ClientsService client directory', () => {
    it('checks ID numbers across the client repository without exposing client data', async () => {
        const clientRepository = {
            findOne: jest
                .fn()
                .mockResolvedValueOnce({ id: 'existing-client' })
                .mockResolvedValueOnce(null),
        };
        const service = new ClientsService(
            clientRepository as never,
            {} as never,
            {} as never,
            {} as never,
            {} as never,
            {} as never,
            {} as never,
            {} as never,
            {} as never
        );

        await expect(service.idNumberExists('9001015009087')).resolves.toBe(true);
        await expect(service.idNumberExists('9101015009088')).resolves.toBe(false);
        expect(clientRepository.findOne).toHaveBeenNthCalledWith(1, {
            select: { id: true },
            where: { idNumber: '9001015009087' },
            withDeleted: true,
        });
    });

    it('resolves file, product and assigned-agent data for the client list', async () => {
        const client = {
            id: '803e284e-d178-4f5b-b76f-81a376398e31',
            fileReference: 'QFN000003',
            firstName: 'Test',
            lastName: 'Client',
            status: ClientStatus.ACTIVE,
            assignedAgentId: 'agent-1',
            selectedProducts: [{ productId: 'product-1', paymentOptionId: 'option-1' }],
        };
        const queryBuilder = {
            where: jest.fn().mockReturnThis(),
            andWhere: jest.fn().mockReturnThis(),
            orderBy: jest.fn().mockReturnThis(),
            skip: jest.fn().mockReturnThis(),
            take: jest.fn().mockReturnThis(),
            getCount: jest.fn().mockResolvedValue(1),
            getMany: jest.fn().mockResolvedValue([client]),
        };
        const clientRepository = {
            createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
        };
        const productRepository = {
            find: jest
                .fn()
                .mockResolvedValue([{ id: 'product-1', code: 'DR', name: 'Debt counselling' }]),
        };
        const userRepository = {
            find: jest
                .fn()
                .mockResolvedValue([{ id: 'agent-1', firstName: 'Lindiwe', lastName: 'Dlamini' }]),
        };
        const service = new ClientsService(
            clientRepository as never,
            {} as never,
            {} as never,
            productRepository as never,
            userRepository as never,
            {} as never,
            {} as never,
            {} as never,
            {} as never
        );

        const result = await service.findAll({ page: 1, limit: 12 });

        expect(result.data[0]).toMatchObject({
            id: client.id,
            fileReference: 'QFN000003',
            assignedAgent: {
                id: 'agent-1',
                firstName: 'Lindiwe',
                lastName: 'Dlamini',
            },
            clientProducts: [
                {
                    productName: 'Debt counselling',
                    product: {
                        id: 'product-1',
                        code: 'DR',
                        name: 'Debt counselling',
                    },
                },
            ],
        });
        expect(productRepository.find).toHaveBeenCalledTimes(1);
        expect(userRepository.find).toHaveBeenCalledTimes(1);
    });

    it('rejects a client product link when the product is not active and available', async () => {
        const clientRepository = {
            findOne: jest.fn().mockResolvedValue(null),
        };
        const productRepository = {
            find: jest.fn().mockResolvedValue([]),
        };
        const service = new ClientsService(
            clientRepository as never,
            {} as never,
            {} as never,
            productRepository as never,
            {} as never,
            {} as never,
            {} as never,
            {} as never,
            {} as never
        );

        await expect(
            service.create({
                idNumber: '9001015009087',
                firstName: 'Naledi',
                lastName: 'Mokoena',
                email: 'naledi@example.test',
                phoneNumber: '0821234567',
                dateOfBirth: '1990-01-01',
                maritalStatus: 'single',
                physicalAddress: '1 Main Road, Pretoria',
                monthlyIncome: 25000,
                monthlyExpenses: 12000,
                totalDebt: 50000,
                selectedProducts: [
                    { productId: 'inactive-product', paymentOptionId: 'inactive-product_once_off' },
                ],
            } as never)
        ).rejects.toBeInstanceOf(BadRequestException);
        expect(productRepository.find).toHaveBeenCalledWith(
            expect.objectContaining({
                where: expect.objectContaining({ status: 'active' }),
            })
        );
    });

    it('validates product links when products are changed after onboarding', async () => {
        const productRepository = {
            find: jest.fn().mockResolvedValue([]),
        };
        const service = new ClientsService(
            {} as never,
            {} as never,
            {} as never,
            productRepository as never,
            {} as never,
            {} as never,
            {} as never,
            {} as never,
            {} as never
        );
        jest.spyOn(service, 'findOne').mockResolvedValue({
            id: 'client-1',
            selectedProducts: [],
        } as never);

        await expect(
            service.update('client-1', {
                selectedProducts: [
                    { productId: 'missing-product', paymentOptionId: 'missing-product_default' },
                ],
            })
        ).rejects.toBeInstanceOf(BadRequestException);
        expect(productRepository.find).toHaveBeenCalledTimes(1);
    });
});
