import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WhatsappService } from './whatsapp.service';
import { WhatsappController } from './whatsapp.controller';
import { WhatsAppMessage } from '@/entities/whatsapp-message.entity';
import { WhatsAppSession } from '@/entities/whatsapp-session.entity';
import { Client } from '@/entities/client.entity';

@Module({
    imports: [TypeOrmModule.forFeature([WhatsAppMessage, WhatsAppSession, Client])],
    controllers: [WhatsappController],
    providers: [WhatsappService],
    exports: [WhatsappService],
})
export class WhatsappModule {}
