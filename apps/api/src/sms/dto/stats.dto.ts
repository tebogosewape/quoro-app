/* eslint-disable indent */
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsISO8601 } from 'class-validator';

export class ZoomStatsQueryDto {
    @ApiPropertyOptional({
        description: 'Start ISO date; provider ignores if not used',
        example: '2025-11-02',
    })
    @IsISO8601()
    @IsOptional()
    from?: string;

    @ApiPropertyOptional({
        description: 'End ISO date; provider ignores if not used',
        example: '2025-11-02',
    })
    @IsISO8601()
    @IsOptional()
    to?: string;
}
