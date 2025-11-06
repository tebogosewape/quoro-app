import {
    Controller,
    Post,
    Body,
    HttpCode,
    HttpStatus,
    UseGuards,
    Get,
    UnauthorizedException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiBearerAuth } from '@nestjs/swagger';
import { AuthLoginDocs } from './swagger/auth-login.swagger';
import { AuthService } from './auth.service';
import { LoginDto, RefreshTokenDto, ForgotPasswordDto, AuthResetPasswordDto } from './auth.dto';
import { LoginResponse, RefreshTokenResponse, AuthenticatedUser } from './auth.types';
import { JwtAuthGuard } from './jwt-auth.guard';
import { CurrentUser } from './current-user.decorator';
import { UsersService } from '../users/users.service';
import {
    RequestPasswordResetDto,
    ResetPasswordDto,
    ValidateResetTokenDto,
} from '../users/users.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
    constructor(
        private readonly authService: AuthService,
        private readonly usersService: UsersService
    ) {}

    /**
     * Login endpoint
     * POST /auth/login
     */
    @Post('login')
    @HttpCode(HttpStatus.OK)
    @AuthLoginDocs()
    @ApiResponse({
        status: 401,
        description: 'Invalid credentials',
        schema: {
            type: 'object',
            properties: {
                statusCode: { type: 'number', example: 401 },
                message: { type: 'string', example: 'Invalid credentials' },
                error: { type: 'string', example: 'Unauthorized' },
            },
        },
    })
    async login(@Body() loginDto: LoginDto): Promise<LoginResponse> {
        return this.authService.login(loginDto);
    }

    @Post('forgot-password')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({
        summary: 'Request password reset',
        description: 'Triggers an email containing a password reset link if the user exists',
    })
    @ApiBody({ type: ForgotPasswordDto })
    @ApiResponse({
        status: 200,
        description: 'Password reset email dispatched when possible',
        schema: {
            type: 'object',
            properties: {
                message: {
                    type: 'string',
                    example: 'If the email exists, a password reset link has been sent',
                },
            },
        },
    })
    async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
        const requestDto: RequestPasswordResetDto = { email: forgotPasswordDto.email };
        return this.usersService.requestPasswordReset(requestDto);
    }

    @Post('reset-password')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({
        summary: 'Reset account password',
        description: 'Applies a new password using a valid reset token',
    })
    @ApiBody({ type: AuthResetPasswordDto })
    @ApiResponse({
        status: 200,
        description: 'Password updated successfully',
        schema: {
            type: 'object',
            properties: {
                message: {
                    type: 'string',
                    example: 'Password has been reset successfully',
                },
            },
        },
    })
    async resetPassword(@Body() body: AuthResetPasswordDto) {
        const resetDto: ResetPasswordDto = {
            email: body.email,
            token: body.token,
            newPassword: body.password,
            confirmPassword: body.confirmPassword,
        };
        return this.usersService.resetPassword(resetDto);
    }

    @Post('reset-password/validate')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({
        summary: 'Validate password reset token',
        description:
            'Checks if a password reset token is still valid before submitting new password',
    })
    @ApiBody({ type: ValidateResetTokenDto })
    async validateResetToken(@Body() body: ValidateResetTokenDto) {
        return this.usersService.validatePasswordResetToken(body);
    }

    /**
     * Refresh token endpoint
     * POST /auth/refresh
     */
    @Post('refresh')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({
        summary: 'Refresh access token',
        description: 'Get new access token using valid refresh token',
    })
    @ApiBody({ type: RefreshTokenDto })
    @ApiResponse({
        status: 200,
        description: 'Token refreshed successfully',
        schema: {
            type: 'object',
            properties: {
                access_token: {
                    type: 'string',
                    example:
                        'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIwZDMzOTljYi1iNTkzLTQ1ZjgtOWUyYy0xZTE1ZDhkMWM5MzQiLCJlbWFpbCI6InNhcmFoLmFnZW50QHF1b3JhLmNvbSIsInJvbGUiOiJhZ2VudCIsImRlcGFydG1lbnQiOiJDbGllbnQgU2VydmljZXMiLCJleHAiOjE3Mjg0MjU2Nzg5MDF9.new_signature',
                },
                expires_in: {
                    type: 'number',
                    example: 900,
                    description: 'New token expiration time in seconds',
                },
            },
        },
    })
    @ApiResponse({
        status: 401,
        description: 'Invalid refresh token',
        schema: {
            type: 'object',
            properties: {
                statusCode: { type: 'number', example: 401 },
                message: { type: 'string', example: 'Invalid refresh token' },
                error: { type: 'string', example: 'Unauthorized' },
            },
        },
    })
    async refresh(@Body() refreshTokenDto: RefreshTokenDto): Promise<RefreshTokenResponse> {
        return this.authService.refreshToken(refreshTokenDto.refresh_token);
    }

    /**
     * Logout endpoint
     * POST /auth/logout
     */
    @Post('logout')
    @UseGuards(JwtAuthGuard)
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiBearerAuth('JWT-auth')
    @ApiOperation({
        summary: 'User logout',
        description: 'Logout user and invalidate refresh token',
    })
    @ApiResponse({
        status: 204,
        description: 'Logout successful',
    })
    @ApiResponse({
        status: 401,
        description: 'Unauthorized',
    })
    async logout(@CurrentUser() user: AuthenticatedUser): Promise<void> {
        await this.authService.logout(user.id);
    }

    /**
     * Get current user profile
     * GET /auth/profile
     */
    @Get('profile')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth('JWT-auth')
    @ApiOperation({
        summary: 'Get user profile',
        description: 'Get current authenticated user profile information',
    })
    @ApiResponse({
        status: 200,
        description: 'User profile retrieved successfully',
        schema: {
            type: 'object',
            properties: {
                id: {
                    type: 'string',
                    example: '0d3399cb-b593-45f8-9e2c-1e15d8d1c934',
                },
                email: {
                    type: 'string',
                    example: 'sarah.agent@quora.com',
                },
                firstName: {
                    type: 'string',
                    example: 'Sarah',
                },
                lastName: {
                    type: 'string',
                    example: 'Agent',
                },
                role: {
                    type: 'string',
                    example: 'agent',
                    enum: ['admin', 'manager', 'agent', 'viewer'],
                },
                department: {
                    type: 'string',
                    example: 'Client Services',
                },
            },
        },
    })
    @ApiResponse({
        status: 401,
        description: 'Unauthorized',
    })
    async getProfile(@CurrentUser() user: AuthenticatedUser): Promise<AuthenticatedUser> {
        const profile = await this.authService.getProfile(user.id);
        if (!profile) {
            throw new UnauthorizedException('User not found');
        }
        return profile;
    }

    /**
     * Health check for authentication
     * GET /auth/health
     */
    @Get('health')
    @ApiOperation({
        summary: 'Authentication service health check',
        description: 'Check if authentication service is running',
    })
    @ApiResponse({
        status: 200,
        description: 'Service is healthy',
    })
    healthCheck(): { status: string; timestamp: string } {
        return {
            status: 'Authentication service is running fine my good sir!',
            timestamp: new Date().toISOString(),
        };
    }
}
