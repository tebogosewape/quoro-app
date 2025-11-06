import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClientsController } from './clients.controller';
import { ClientsService } from './clients.service';
import { Client } from '@/entities/client.entity';
import { MailModule } from '@/mail/mail.module';
import { SmsModule } from '@/sms/sms.module';
import { WhatsappModule } from '@/whatsapp/whatsapp.module';
import { AuditModule } from '@/modules/audit/audit.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([Client]),
        MailModule,
        SmsModule,
        WhatsappModule,
        AuditModule,
    ],
    controllers: [ClientsController],
    providers: [ClientsService],
    exports: [ClientsService],
})
export class ClientsModule {}
