/* eslint-disable indent */
import { IsDate, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateLeadDto {
    @ApiProperty({
        description: 'Time the lead was received',
        example: '2025-11-05T10:30:00Z',
        type: Date,
    })
    @IsDate()
    @Type(() => Date)
    timeReceived!: Date;

    @ApiPropertyOptional({
        description: 'Franchise name',
        example: 'JHB North',
        maxLength: 100,
        nullable: true,
    })
    @IsOptional()
    @IsString()
    franchise?: string | null;

    @ApiPropertyOptional({
        description: 'Lead name',
        example: 'John Doe',
        maxLength: 150,
        nullable: true,
    })
    @IsOptional()
    @IsString()
    name?: string | null;

    @ApiProperty({
        description: 'Cell phone number (digits only)',
        example: '0821234567',
        maxLength: 32,
    })
    @IsString()
    cell!: string; // digits only

    @ApiPropertyOptional({
        description: 'ID number',
        example: '8501015800081',
        maxLength: 32,
        nullable: true,
    })
    @IsOptional()
    @IsString()
    idNumber?: string | null;

    @ApiPropertyOptional({
        description: 'Affiliate source',
        example: 'Google Ads',
        maxLength: 100,
        nullable: true,
    })
    @IsOptional()
    @IsString()
    affiliate?: string | null;

    @ApiPropertyOptional({
        description: 'Lead message or inquiry',
        example: 'Interested in debt consolidation',
        nullable: true,
    })
    @IsOptional()
    @IsString()
    message?: string | null;

    @ApiPropertyOptional({
        description: 'Agent or team the lead is allocated to',
        example: 'Agent Smith',
        maxLength: 120,
        nullable: true,
    })
    @IsOptional()
    @IsString()
    allocatedTo?: string | null;

    @ApiPropertyOptional({
        description: 'Outcome or status of the lead',
        example: 'Contacted',
        maxLength: 120,
        nullable: true,
    })
    @IsOptional()
    @IsString()
    leadOutcome?: string | null;
}
