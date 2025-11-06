import { IsEmail, IsOptional, IsString, MinLength, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class LoginDto {
    @ApiProperty({
        description: 'User email, username, or phone number',
        example: 'sarah.agent@quora.com',
    })
    @IsString({ message: 'Please provide a valid login identifier' })
    @MinLength(3, { message: 'Identifier must be at least 3 characters long' })
    @MaxLength(320, { message: 'Identifier must not exceed 320 characters' })
    @Transform(({ value, obj }) => {
        if (typeof value === 'string' && value.trim().length > 0) {
            return value.trim();
        }

        const emailFallback = obj?.email;
        if (typeof emailFallback === 'string' && emailFallback.trim().length > 0) {
            return emailFallback.trim();
        }

        return value;
    })
        identifier!: string;

    @ApiProperty({
        description: 'Legacy email field retained for backwards compatibility',
        example: 'sarah.agent@quora.com',
        required: false,
    })
    @IsOptional()
    @IsEmail({}, { message: 'Please provide a valid email address' })
    @Transform(({ value }) => value?.trim())
        email?: string;

    @ApiProperty({
        description: 'User password',
        example: 'Password123!',
        minLength: 6,
        maxLength: 100,
    })
    @IsString({ message: 'Password must be a string' })
    @MinLength(6, { message: 'Password must be at least 6 characters long' })
    @MaxLength(100, { message: 'Password must not exceed 100 characters' })
        password!: string;
}

export class RefreshTokenDto {
    @ApiProperty({
        description: 'Valid refresh token',
        example:
            'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIwZDMzOTljYi1iNTkzLTQ1ZjgtOWUyYy0xZTE1ZDhkMWM5MzQiLCJlbWFpbCI6InNhcmFoLmFnZW50QHF1b3JhLmNvbSIsInJvbGUiOiJhZ2VudCIsImRlcGFydG1lbnQiOiJDbGllbnQgU2VydmljZXMiLCJleHAiOjE3Mjg0MjU2Nzg5MDF9.mock_signature',
    })
    @IsString({ message: 'Refresh token must be a string' })
        refresh_token!: string;
}

export class ForgotPasswordDto {
    @ApiProperty({
        description: 'Email address to dispatch the password reset link to',
        example: 'user@example.com',
    })
    @IsEmail({}, { message: 'Please provide a valid email address' })
    @Transform(({ value }) => value?.toLowerCase()?.trim())
        email!: string;
}

export class AuthResetPasswordDto {
    @ApiProperty({
        description: 'Email address associated with the reset token',
        example: 'user@example.com',
    })
    @IsEmail({}, { message: 'Please provide a valid email address' })
    @Transform(({ value }) => value?.toLowerCase()?.trim())
        email!: string;

    @ApiProperty({
        description: 'Token issued via the forgot password flow',
        example: 'abc123def456',
    })
    @IsString({ message: 'Reset token must be a string' })
        token!: string;

    @ApiProperty({
        description: 'New password to set for the account',
        example: 'NewSecurePass123!',
    })
    @IsString({ message: 'Password must be a string' })
    @MinLength(8, { message: 'Password must be at least 8 characters long' })
    @MaxLength(100, { message: 'Password must not exceed 100 characters' })
        password!: string;

    @ApiPropertyOptional({
        description: 'Optional confirmation of the new password',
        example: 'NewSecurePass123!',
    })
    @IsOptional()
    @IsString({ message: 'Confirm password must be a string' })
        confirmPassword?: string;
}
