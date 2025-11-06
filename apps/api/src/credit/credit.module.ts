// src/credit/credit.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CreditAssessmentService } from './credit-assessment.service';
import { CreditAssessmentController } from './credit-assessment.controller';

@Module({
    imports: [ConfigModule],
    controllers: [CreditAssessmentController],
    providers: [CreditAssessmentService],
})
export class CreditModule {}
