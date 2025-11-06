/* eslint-disable indent */
import { IsEmail, IsNotEmpty, IsOptional, IsString, ArrayNotEmpty, IsArray } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SendEmailDto {
    @ApiProperty({
        type: [String],
        description: 'Recipient email addresses',
        example: ['user@example.com'],
    })
    @IsArray()
    @ArrayNotEmpty()
    @IsEmail({}, { each: true })
    to!: string[];

    @ApiPropertyOptional({
        type: [String],
        description: 'CC email addresses',
        example: ['cc@example.com'],
    })
    @IsOptional()
    @IsArray()
    @IsEmail({}, { each: true })
    cc?: string[];

    @ApiPropertyOptional({
        type: [String],
        description: 'BCC email addresses',
        example: ['bcc@example.com'],
    })
    @IsOptional()
    @IsArray()
    @IsEmail({}, { each: true })
    bcc?: string[];

    @ApiProperty({
        type: String,
        description: 'Email subject',
        example: 'Welcome to our service',
    })
    @IsString()
    @IsNotEmpty()
    subject!: string;

    @ApiPropertyOptional({
        type: String,
        description: 'Plain text email body',
        example: 'Hello, this is a plain text email.',
    })
    @IsOptional()
    @IsString()
    text?: string;

    @ApiPropertyOptional({
        type: String,
        description: 'HTML email body',
        example: '<p>Hello, this is an <b>HTML</b> email.</p>',
    })
    @IsOptional()
    @IsString()
    html?: string;
}
