/* eslint-disable indent */
import { IsArray, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SendTemplateDto {
    @ApiProperty({
        type: String,
        description: 'Recipient WhatsApp number (E.164 format)',
        example: '27721234567',
    })
    @IsString()
    @IsNotEmpty()
    to!: string; // "2772..."

    @ApiProperty({
        type: String,
        description: 'Template name',
        example: 'hello_world',
    })
    @IsString()
    @IsNotEmpty()
    name!: string; // template name e.g. "hello_world"

    @ApiPropertyOptional({
        type: String,
        description: 'Language code (default: en_US)',
        example: 'en_US',
        default: 'en_US',
    })
    @IsString()
    @IsOptional()
    languageCode: string = 'en_US'; // default

    @ApiPropertyOptional({
        type: [Object],
        description: 'Optional template components (variables, buttons, etc.)',
        example: [{ type: 'body', parameters: [{ type: 'text', text: 'John' }] }],
    })
    @IsOptional()
    @IsArray()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    components?: any[];
}
