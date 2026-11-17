import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches } from 'class-validator';

export class CheckClientIdDto {
    @ApiProperty({
        description: 'South African identity number to check for an existing client',
        example: '9001015009087',
    })
    @IsString()
    @Matches(/^\d{13}$/, { message: 'ID number must be exactly 13 digits' })
        idNumber!: string;
}
