// src/credit/credit.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CreditAssessmentService } from './credit-assessment.service';

@Module({
    imports: [ConfigModule],
    providers: [CreditAssessmentService],
    exports: [CreditAssessmentService],
})
export class CreditModule {}
