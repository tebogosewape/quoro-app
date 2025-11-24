import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Lead } from '@/entities/lead.entity';
import { LeadsController } from './leads.controller';
import { LeadsService } from './leads.service';
import { AuditModule } from '@/modules/audit/audit.module';

@Module({
    imports: [TypeOrmModule.forFeature([Lead]), AuditModule],
    controllers: [LeadsController],
    providers: [LeadsService],
})
export class LeadsModule {}
