/* eslint-disable indent */
import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class SendMessageDto {
    @IsString()
    @IsNotEmpty()
    clientId!: string;

    @IsString()
    @IsNotEmpty()
    message!: string;
}

export class GetMessagesDto {
    @IsString()
    @IsNotEmpty()
    clientId!: string;

    @IsOptional()
    @IsString()
    limit?: string;
}
