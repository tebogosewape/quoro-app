import { Repository } from 'typeorm';
import { Client } from '@/entities/client.entity';
import { WhatsAppMessage } from '@/entities/whatsapp-message.entity';
import { WhatsAppSession } from '@/entities/whatsapp-session.entity';
import { WhatsappService } from './whatsapp.service';

describe('WhatsappService runtime ownership', () => {
    const originalEnabledValue = process.env.WHATSAPP_ENABLED;

    afterEach(() => {
        if (originalEnabledValue === undefined) {
            delete process.env.WHATSAPP_ENABLED;
        } else {
            process.env.WHATSAPP_ENABLED = originalEnabledValue;
        }
        jest.restoreAllMocks();
    });

    it('does not initialise a session or Chromium when disabled for a worker process', async () => {
        process.env.WHATSAPP_ENABLED = 'false';
        const sessionRepo = {
            findOne: jest.fn(),
        } as unknown as Repository<WhatsAppSession>;
        const service = new WhatsappService(
            {} as Repository<WhatsAppMessage>,
            sessionRepo,
            {} as Repository<Client>
        );

        await service.onModuleInit();

        expect(sessionRepo.findOne).not.toHaveBeenCalled();
        expect(service.isClientReady()).toBe(false);
        await expect(service.resetSession()).rejects.toThrow(
            'WhatsApp runtime is disabled for this process'
        );
    });
});
