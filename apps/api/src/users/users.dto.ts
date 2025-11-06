import { IsEmail, IsString, IsEnum, IsOptional, MinLength, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole, UserStatus } from '../entities/user.entity';

export class CreateUserDto {
    @ApiProperty({ example: 'John', description: 'User first name' })
    @IsString({ message: 'First name must be a string' })
    @MinLength(2, { message: 'First name must be at least 2 characters' })
    @MaxLength(50, { message: 'First name must not exceed 50 characters' })
    firstName!: string;

    @ApiProperty({ example: 'Doe', description: 'User last name' })
    @IsString({ message: 'Last name must be a string' })
    @MinLength(2, { message: 'Last name must be at least 2 characters' })
    @MaxLength(50, { message: 'Last name must not exceed 50 characters' })
    lastName!: string;

    @ApiProperty({ example: 'johndoe', description: 'User name' })
    @IsString({ message: 'User name must be a string' })
    @MinLength(2, { message: 'User name must be at least 2 characters' })
    @MaxLength(50, { message: 'User name must not exceed 50 characters' })
    username!: string;

    @ApiProperty({ example: 'john.doe@company.com', description: 'User email address' })
    @IsEmail({}, { message: 'Please provide a valid email address' })
    @Transform(({ value }) => value?.toLowerCase()?.trim())
    email!: string;

    @ApiProperty({ example: 'SecurePass123!', description: 'User password' })
    @IsString({ message: 'Password must be a string' })
    @MinLength(8, { message: 'Password must be at least 8 characters long' })
    @MaxLength(100, { message: 'Password must not exceed 100 characters' })
    password!: string;

    @ApiProperty({ example: 'EMP001', description: 'Employee number' })
    @IsString({ message: 'Employee number must be a string' })
    @MaxLength(20, { message: 'Employee number must not exceed 20 characters' })
    employeeNumber!: string;

    @ApiProperty({
        enum: UserRole,
        example: UserRole.AGENT,
        description: 'User role in the system',
    })
    @IsEnum(UserRole, { message: 'Role must be a valid user role' })
    role!: UserRole;

    @ApiPropertyOptional({ example: '0821234567', description: 'Phone number' })
    @IsOptional()
    @IsString({ message: 'Phone number must be a string' })
    @MaxLength(20, { message: 'Phone number must not exceed 20 characters' })
    phoneNumber?: string;

    @ApiPropertyOptional({ example: 'Senior Agent', description: 'Job title' })
    @IsOptional()
    @IsString({ message: 'Title must be a string' })
    @MaxLength(100, { message: 'Title must not exceed 100 characters' })
    title?: string;

    @ApiPropertyOptional({ example: 'Client Services', description: 'Department' })
    @IsOptional()
    @IsString({ message: 'Department must be a string' })
    @MaxLength(100, { message: 'Department must not exceed 100 characters' })
    department?: string;

    @ApiPropertyOptional({ example: 'Client Services', description: 'status' })
    @IsOptional()
    @IsString({ message: 'status must be a string' })
    @MaxLength(100, { message: 'status must not exceed 100 characters' })
    status?: string;
}

export class UpdateUserDto {
    @ApiPropertyOptional({ example: 'John', description: 'User first name' })
    @IsOptional()
    @IsString({ message: 'First name must be a string' })
    @MinLength(2, { message: 'First name must be at least 2 characters' })
    @MaxLength(50, { message: 'First name must not exceed 50 characters' })
    firstName?: string;

    @ApiPropertyOptional({ example: 'Doe', description: 'User last name' })
    @IsOptional()
    @IsString({ message: 'Last name must be a string' })
    @MinLength(2, { message: 'Last name must be at least 2 characters' })
    @MaxLength(50, { message: 'Last name must not exceed 50 characters' })
    lastName?: string;

    @ApiProperty({ example: 'johndoe', description: 'User name' })
    @IsString({ message: 'User name must be a string' })
    @MinLength(2, { message: 'User name must be at least 2 characters' })
    @MaxLength(50, { message: 'User name must not exceed 50 characters' })
    username!: string;

    @ApiPropertyOptional({ example: 'john.doe@company.com', description: 'User email address' })
    @IsOptional()
    @IsEmail({}, { message: 'Please provide a valid email address' })
    @Transform(({ value }) => value?.toLowerCase()?.trim())
    email?: string;

    @ApiPropertyOptional({ example: 'EMP001', description: 'Employee number' })
    @IsOptional()
    @IsString({ message: 'Employee number must be a string' })
    @MaxLength(20, { message: 'Employee number must not exceed 20 characters' })
    employeeNumber?: string;

    @ApiPropertyOptional({
        enum: UserRole,
        example: UserRole.AGENT,
        description: 'User role in the system',
    })
    @IsOptional()
    @IsEnum(UserRole, { message: 'Role must be a valid user role' })
    role?: UserRole;

    @ApiPropertyOptional({
        enum: UserStatus,
        example: UserStatus.ACTIVE,
        description: 'User status',
    })
    @IsOptional()
    @IsEnum(UserStatus, { message: 'Status must be a valid user status' })
    status?: UserStatus;

    @ApiPropertyOptional({ example: '0821234567', description: 'Phone number' })
    @IsOptional()
    @IsString({ message: 'Phone number must be a string' })
    @MaxLength(20, { message: 'Phone number must not exceed 20 characters' })
    phoneNumber?: string;

    @ApiPropertyOptional({ example: 'Senior Agent', description: 'Job title' })
    @IsOptional()
    @IsString({ message: 'Title must be a string' })
    @MaxLength(100, { message: 'Title must not exceed 100 characters' })
    title?: string;

    @ApiPropertyOptional({ example: 'Client Services', description: 'Department' })
    @IsOptional()
    @IsString({ message: 'Department must be a string' })
    @MaxLength(100, { message: 'Department must not exceed 100 characters' })
    department?: string;
}

export class ChangePasswordDto {
    @ApiProperty({ example: 'CurrentPass123!', description: 'Current password' })
    @IsString({ message: 'Current password must be a string' })
    currentPassword!: string;

    @ApiProperty({ example: 'NewSecurePass123!', description: 'New password' })
    @IsString({ message: 'New password must be a string' })
    @MinLength(8, { message: 'New password must be at least 8 characters long' })
    @MaxLength(100, { message: 'New password must not exceed 100 characters' })
    newPassword!: string;
}

export class ResetPasswordDto {
    @ApiProperty({ example: 'user@company.com', description: 'User email address' })
    @IsEmail({}, { message: 'Please provide a valid email address' })
    @Transform(({ value }) => value?.toLowerCase()?.trim())
    email!: string;

    @ApiProperty({ example: 'reset-token-abc123', description: 'Password reset token' })
    @IsString({ message: 'Reset token must be a string' })
    token!: string;

    @ApiProperty({ example: 'NewSecurePass123!', description: 'New password' })
    @IsString({ message: 'New password must be a string' })
    @MinLength(8, { message: 'New password must be at least 8 characters long' })
    @MaxLength(100, { message: 'New password must not exceed 100 characters' })
    newPassword!: string;

    @ApiPropertyOptional({ example: 'NewSecurePass123!', description: 'Confirm new password' })
    @IsOptional()
    @IsString({ message: 'Confirm password must be a string' })
    confirmPassword?: string;
}

export class RequestPasswordResetDto {
    @ApiProperty({ example: 'user@company.com', description: 'User email address' })
    @IsEmail({}, { message: 'Please provide a valid email address' })
    @Transform(({ value }) => value?.toLowerCase()?.trim())
    email!: string;
}

export class ValidateResetTokenDto {
    @ApiProperty({ example: 'user@company.com', description: 'User email address' })
    @IsEmail({}, { message: 'Please provide a valid email address' })
    @Transform(({ value }) => value?.toLowerCase()?.trim())
    email!: string;

    @ApiProperty({ example: 'reset-token-abc123', description: 'Password reset token' })
    @IsString({ message: 'Reset token must be a string' })
    token!: string;
}
