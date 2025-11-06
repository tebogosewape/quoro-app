/* eslint-disable indent */
import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, Max, Min } from 'class-validator';

export class CommissionResponseDto {
    @ApiProperty({ example: 10.0, description: 'Global agent commission percentage (0..100)' })
    percentage!: number;
}

export class UpdateCommissionDto {
    @ApiProperty({ example: 12.5, description: 'New global commission percentage (0..100)' })
    @IsNumber()
    @Min(0)
    @Max(100)
    percentage!: number;
}
