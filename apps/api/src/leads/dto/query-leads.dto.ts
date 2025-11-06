/* eslint-disable indent */
import { IsOptional, IsInt, Min, Max, IsString, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class QueryLeadsDto {
    @ApiPropertyOptional({
        description: 'Page number (1-based)',
        example: 1,
        minimum: 1,
        default: 1,
    })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    page?: number = 1;

    @ApiPropertyOptional({
        description: 'Number of items per page',
        example: 20,
        minimum: 1,
        maximum: 100,
        default: 20,
    })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(100)
    limit?: number = 20;

    @ApiPropertyOptional({
        description: 'Search term (searches name, cell, ID number)',
        example: 'John',
    })
    @IsOptional()
    @IsString()
    search?: string;

    @ApiPropertyOptional({
        description: 'Filter by franchise',
        example: 'JHB North',
    })
    @IsOptional()
    @IsString()
    franchise?: string;

    @ApiPropertyOptional({
        description: 'Filter by affiliate',
        example: 'Google Ads',
    })
    @IsOptional()
    @IsString()
    affiliate?: string;

    @ApiPropertyOptional({
        description: 'Filter by allocated agent/team',
        example: 'Agent Smith',
    })
    @IsOptional()
    @IsString()
    allocatedTo?: string;

    @ApiPropertyOptional({
        description: 'Filter by lead outcome',
        example: 'Converted',
    })
    @IsOptional()
    @IsString()
    leadOutcome?: string;

    @ApiPropertyOptional({
        description: 'Filter by start date (YYYY-MM-DD)',
        example: '2025-01-01',
    })
    @IsOptional()
    @IsString()
    startDate?: string;

    @ApiPropertyOptional({
        description: 'Filter by end date (YYYY-MM-DD)',
        example: '2025-12-31',
    })
    @IsOptional()
    @IsString()
    endDate?: string;

    @ApiPropertyOptional({
        description: 'Field to sort by',
        example: 'timeReceived',
        enum: ['timeReceived', 'name', 'cell', 'createdAt'],
        default: 'timeReceived',
    })
    @IsOptional()
    @IsEnum(['timeReceived', 'name', 'cell', 'createdAt'])
    sortBy?: string = 'timeReceived';

    @ApiPropertyOptional({
        description: 'Sort order',
        example: 'DESC',
        enum: ['ASC', 'DESC'],
        default: 'DESC',
    })
    @IsOptional()
    @IsEnum(['ASC', 'DESC'])
    sortOrder?: 'ASC' | 'DESC' = 'DESC';
}
