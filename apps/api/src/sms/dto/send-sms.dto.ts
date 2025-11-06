/* eslint-disable indent */
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsNotEmpty, MaxLength, IsDateString } from 'class-validator';

export class SendSmsDto {
    @ApiProperty({ example: 'Testing again' })
    @IsString()
    @IsNotEmpty()
    message!: string;

    @ApiPropertyOptional({ example: '' })
    @IsString()
    @IsOptional()
    @MaxLength(128)
    campaign?: string;

    @ApiPropertyOptional({ example: '2025-11-02', description: 'YYYY-MM-DD (Zoom optional).' })
    @IsDateString()
    @IsOptional()
    dateToSend?: string;

    @ApiPropertyOptional({ example: '2025-11-02' })
    @IsString()
    @IsOptional()
    @MaxLength(128)
    dataField?: string;

    @ApiPropertyOptional({
        example: '27833532301',
        description: 'If omitted, will fall back to current user phone (normalized).',
    })
    @IsString()
    @IsOptional()
    @MaxLength(32)
    recipientNumber?: string;
}

export class SendSmsResponseDto {
    @ApiProperty({ example: '6906be56e4b0c379743f8aaa' })
    messageId!: string;

    @ApiProperty({ example: null, nullable: true })
    error!: string | null;
}
