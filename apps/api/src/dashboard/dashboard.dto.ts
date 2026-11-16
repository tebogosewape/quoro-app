import { IsEnum, IsOptional, IsUUID } from 'class-validator';

export enum DashboardTimeRange {
    TODAY = 'today',
    WEEK = 'week',
    MONTH = 'month',
    QUARTER = 'quarter',
    YEAR = 'year',
    CUSTOM = 'custom',
}

export class DashboardFiltersDto {
    @IsOptional()
    @IsEnum(DashboardTimeRange)
    timeRange?: DashboardTimeRange;

    @IsOptional()
    @IsUUID()
    agentId?: string;
}
