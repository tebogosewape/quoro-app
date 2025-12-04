import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClientsController } from './clients.controller';
import { ClientsService } from './clients.service';
import { ExperianReportService } from './experian-report.service';
import { ExperianApiService } from './experian-api.service';
import { Client } from '@/entities/client.entity';
import { Lead } from '@/entities/lead.entity';
import { AuditLog } from '@/entities/audit-log.entity';
import { CreditReport } from '@/entities/credit-report.entity';
import { MailModule } from '@/mail/mail.module';
import { SmsModule } from '@/sms/sms.module';
import { WhatsappModule } from '@/whatsapp/whatsapp.module';
import { AuditModule } from '@/modules/audit/audit.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([Client, Lead, AuditLog, CreditReport]),
        MailModule,
        SmsModule,
        WhatsappModule,
        AuditModule,
    ],
    controllers: [ClientsController],
    providers: [ClientsService, ExperianReportService, ExperianApiService],
    exports: [ClientsService, ExperianApiService],
})
export class ClientsModule {}
