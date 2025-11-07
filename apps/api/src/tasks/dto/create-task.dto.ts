/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable indent */
import {
    IsString,
    IsEnum,
    IsOptional,
    IsUUID,
    IsDateString,
    IsNumber,
    IsObject,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TaskStatus, TaskPriority, TaskType } from '@/entities/task.entity';

export class CreateTaskDto {
    @ApiProperty({ description: 'Task title', example: 'Convert Lead: John Doe' })
    @IsString()
    title!: string;

    @ApiPropertyOptional({ description: 'Task description', example: 'Follow up with lead...' })
    @IsOptional()
    @IsString()
    description?: string;

    @ApiProperty({
        description: 'Task type',
        enum: [
            'consultation',
            'document_collection',
            'verification',
            'credit_check',
            'follow_up',
            'review',
            'approval',
            'communication',
            'internal',
            'other',
        ],
    })
    @IsEnum([
        'consultation',
        'document_collection',
        'verification',
        'credit_check',
        'follow_up',
        'review',
        'approval',
        'communication',
        'internal',
        'other',
    ])
    type!: TaskType;

    @ApiPropertyOptional({
        description: 'Task status',
        enum: [
            'pending',
            'assigned',
            'in_progress',
            'completed',
            'cancelled',
            'overdue',
            'on_hold',
        ],
        default: 'pending',
    })
    @IsOptional()
    @IsEnum(['pending', 'assigned', 'in_progress', 'completed', 'cancelled', 'overdue', 'on_hold'])
    status?: TaskStatus;

    @ApiPropertyOptional({
        description: 'Task priority',
        enum: ['low', 'normal', 'high', 'urgent'],
        default: 'normal',
    })
    @IsOptional()
    @IsEnum(['low', 'normal', 'high', 'urgent'])
    priority?: TaskPriority;

    @ApiPropertyOptional({ description: 'Due date', example: '2025-11-10T00:00:00Z' })
    @IsOptional()
    @IsDateString()
    dueDate?: string;

    @ApiPropertyOptional({ description: 'Estimated hours', example: 2.5 })
    @IsOptional()
    @IsNumber()
    estimatedHours?: number;

    @ApiPropertyOptional({ description: 'Assigned user ID', example: 'uuid' })
    @IsOptional()
    @IsUUID()
    assignedToUserId?: string;

    @ApiPropertyOptional({ description: 'Client ID', example: 'uuid' })
    @IsOptional()
    @IsUUID()
    clientId?: string;

    @ApiPropertyOptional({
        description: 'Additional metadata',
        example: { leadId: 'uuid', leadData: {} },
    })
    @IsOptional()
    @IsObject()
    metadata?: Record<string, any>;
}
