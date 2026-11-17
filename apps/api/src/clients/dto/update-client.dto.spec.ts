import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { UpdateClientDto } from './update-client.dto';

describe('UpdateClientDto', () => {
    it('allows the DebiCheck consent flag used by the product-linking hand-off', async () => {
        const dto = plainToInstance(UpdateClientDto, {
            debiCheckConsentGiven: true,
            selectedProducts: [
                {
                    productId: 'product-1',
                    paymentOptionId: 'product-1_recurring',
                    mandateStatus: 'pending',
                    mandateCollectionDay: '25',
                },
            ],
        });

        await expect(validate(dto, { whitelist: true, forbidNonWhitelisted: true })).resolves.toEqual(
            []
        );
    });

    it('still rejects non-boolean consent values', async () => {
        const dto = plainToInstance(UpdateClientDto, {
            debiCheckConsentGiven: 'yes',
        });

        const errors = await validate(dto, { whitelist: true, forbidNonWhitelisted: true });
        expect(errors[0]?.constraints?.isBoolean).toBeDefined();
    });
});
