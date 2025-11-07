/* eslint-disable indent */
import { PartialType } from '@nestjs/swagger';
import { CreateTaskDto } from './create-task.dto';
import { IsOptional, IsNumber, IsString, IsDateString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateTaskDto extends PartialType(CreateTaskDto) {
    @ApiPropertyOptional({ description: 'Actual hours spent', example: 3.5 })
    @IsOptional()
    @IsNumber()
    actualHours?: number;

    @ApiPropertyOptional({
        description: 'Completion notes',
        example: 'Task completed successfully',
    })
    @IsOptional()
    @IsString()
    completionNotes?: string;

    @ApiPropertyOptional({ description: 'Completion date', example: '2025-11-07T10:00:00Z' })
    @IsOptional()
    @IsDateString()
    completedAt?: string;
}
