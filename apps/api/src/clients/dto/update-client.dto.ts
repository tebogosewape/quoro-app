/* eslint-disable indent */
import { PartialType } from '@nestjs/mapped-types';
import { IsOptional, IsDate, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import { CreateClientDto } from './create-client.dto';

export class UpdateClientDto extends PartialType(CreateClientDto) {
    @IsOptional()
    @IsDate()
    @Type(() => Date)
    creditReportViewedAt?: Date;

    @IsOptional()
    @IsString()
    creditReportViewedBy?: string;
}
