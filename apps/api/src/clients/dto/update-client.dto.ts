/* eslint-disable indent */
import { PartialType } from '@nestjs/mapped-types';
import { IsOptional, IsDate, IsString, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';
import { CreateClientDto } from './create-client.dto';

export class UpdateClientDto extends PartialType(CreateClientDto) {
    // Declared explicitly because this flag is written during the post-link
    // mandate hand-off and must be present in the update validation metadata.
    @IsOptional()
    @IsBoolean()
    debiCheckConsentGiven?: boolean;

    @IsOptional()
    @IsString()
    notes?: string;

    @IsOptional()
    @IsDate()
    @Type(() => Date)
    creditReportViewedAt?: Date;

    @IsOptional()
    @IsString()
    creditReportViewedBy?: string;
}
