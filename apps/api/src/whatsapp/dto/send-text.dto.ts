/* eslint-disable indent */
import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SendTextDto {
    @ApiProperty({
        type: String,
        description: "Recipient WhatsApp number (E.164 format, no '+')",
        example: '27726058688',
    })
    @IsString()
    @IsNotEmpty()
    to!: string; // E.164 without '+', e.g. "27726058688"

    @ApiProperty({
        type: String,
        description: 'Free-form message text',
        example: 'Hello, this is a WhatsApp message.',
    })
    @IsString()
    @IsNotEmpty()
    message!: string; // free-form text
}
