import {
    Controller,
    Get,
    Post,
    Put,
    Patch,
    Delete,
    Body,
    Param,
    Query,
    ParseUUIDPipe,
    UseGuards,
    ForbiddenException,
    Logger,
} from '@nestjs/common';
import {
    ApiTags,
    ApiOperation,
    ApiResponse,
    ApiBearerAuth,
    ApiQuery,
    ApiParam,
    ApiBody,
} from '@nestjs/swagger';
import { UsersService, UserListQuery, UserListResponse } from './users.service';
import {
    CreateUserDto,
    UpdateUserDto,
    ChangePasswordDto,
    ResetPasswordDto,
    RequestPasswordResetDto,
    ValidateResetTokenDto,
} from './users.dto';
import { User, UserRole } from '../entities/user.entity';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthenticatedUser } from '../auth/auth.types';

@ApiTags('Users')
@Controller('users')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
    static readonly userResponse = {
        schema: { $ref: '#/components/schemas/User' },
    };

    static readonly messageResponse = {
        schema: {
            type: 'object',
            properties: { message: { type: 'string' } },
        },
    };

    static readonly validationResponse = {
        schema: {
            type: 'object',
            properties: {
                valid: { type: 'boolean' },
                expiresAt: { type: 'string', format: 'date-time' },
            },
        },
    };

    static readonly userListResponse = {
        schema: {
            type: 'object',
            properties: {
                users: { type: 'array', items: { $ref: '#/components/schemas/User' } },
                total: { type: 'number' },
                page: { type: 'number' },
                limit: { type: 'number' },
                totalPages: { type: 'number' },
            },
        },
    };

    static readonly userStatsResponse = {
        schema: {
            type: 'object',
            properties: {
                total: { type: 'number' },
                byRole: { type: 'object', additionalProperties: { type: 'number' } },
                byStatus: { type: 'object', additionalProperties: { type: 'number' } },
                byDepartment: { type: 'object', additionalProperties: { type: 'number' } },
            },
        },
    };

    private readonly logger = new Logger(UsersController.name);

    constructor(private readonly usersService: UsersService) {}

    // Simple envelope helper
    private ok<T>(data: T) {
        return {
            success: true,
            data,
            meta: {
                timestamp: new Date().toISOString(),
                version: '1.0.0',
            },
        };
    }

    @Post()
    @Roles(UserRole.ADMIN, UserRole.MANAGER)
    @ApiOperation({
        summary: 'Create a new user',
        description: 'Create a new user account. Only Admin and Manager roles can create users.',
    })
    @ApiBody({ type: CreateUserDto })
    @ApiResponse({
        status: 201,
        description: 'User created successfully',
        content: { 'application/json': UsersController.userResponse },
    })
    @ApiResponse({ status: 400, description: 'Invalid input data' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 403, description: 'Insufficient permissions' })
    @ApiResponse({ status: 409, description: 'Email or employee number already exists' })
    async createUser(
        @Body() createUserDto: CreateUserDto,
        @CurrentUser() currentUser: AuthenticatedUser
    ) {
        this.logger.log(`Creating user with email: ${createUserDto.email}`);
        const user = await this.usersService.createUser(createUserDto, currentUser);
        return this.ok(user);
    }

    @Get()
    @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.AGENT)
    @ApiOperation({
        summary: 'Get list of users',
        description:
            'Retrieve a paginated list of users with optional filtering and search. Use ?all=1 to fetch all users (capped).',
    })
    @ApiQuery({ name: 'page', required: false, type: Number })
    @ApiQuery({ name: 'limit', required: false, type: Number })
    @ApiQuery({ name: 'search', required: false, type: String })
    @ApiQuery({ name: 'role', required: false, enum: UserRole })
    @ApiQuery({ name: 'status', required: false, type: String })
    @ApiQuery({ name: 'department', required: false, type: String })
    @ApiQuery({
        name: 'all',
        required: false,
        type: String,
        description: 'Set to 1/true to fetch all',
    })
    @ApiResponse({ status: 200, description: 'Users retrieved successfully' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 403, description: 'Insufficient permissions' })
    async getUsers(@Query() query: UserListQuery) {
        this.logger.log(`Fetching users with query: ${JSON.stringify(query)}`);
        const list = await this.usersService.getUsers(query);
        return this.ok<UserListResponse>(list);
    }

    @Get('stats')
    @Roles(UserRole.ADMIN, UserRole.MANAGER)
    @ApiOperation({ summary: 'Get user statistics' })
    @ApiResponse({ status: 200, description: 'User statistics retrieved successfully' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 403, description: 'Insufficient permissions' })
    async getUserStats() {
        const stats = await this.usersService.getUserStats();
        return this.ok(stats);
    }

    @Get('team-lead/agents')
    @Roles(UserRole.TEAM_LEADER)
    @ApiOperation({
        summary: 'Get agents managed by team lead',
        description:
            'Retrieve all agents assigned to the current team lead with their lead counts, conversion stats, and leave status',
    })
    @ApiResponse({
        status: 200,
        description: 'Agents retrieved successfully',
        schema: {
            type: 'object',
            properties: {
                agents: {
                    type: 'array',
                    items: {
                        type: 'object',
                        properties: {
                            id: { type: 'string' },
                            firstName: { type: 'string' },
                            lastName: { type: 'string' },
                            email: { type: 'string' },
                            role: { type: 'string' },
                            isOnLeave: { type: 'boolean' },
                            totalLeads: { type: 'number' },
                            convertedClients: { type: 'number' },
                            hotLeads: { type: 'number' },
                            busyLeads: { type: 'number' },
                            callLaterLeads: { type: 'number' },
                            conversionRate: { type: 'number' },
                        },
                    },
                },
            },
        },
    })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({
        status: 403,
        description: 'Insufficient permissions - team leader role required',
    })
    async getTeamLeadAgents(@CurrentUser() currentUser: AuthenticatedUser) {
        this.logger.log(`Team lead ${currentUser.id} fetching their agents`);
        const agents = await this.usersService.getTeamLeadAgents(currentUser.id);
        return this.ok({ agents });
    }

    @Patch(':id/leave-status')
    @Roles(UserRole.TEAM_LEADER)
    @ApiOperation({
        summary: 'Toggle agent leave status',
        description:
            'Update the leave status of an agent. Agents on leave will not receive new lead allocations.',
    })
    @ApiParam({ name: 'id', description: 'Agent User UUID' })
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                isOnLeave: { type: 'boolean' },
            },
            required: ['isOnLeave'],
        },
    })
    @ApiResponse({ status: 200, description: 'Leave status updated successfully' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({
        status: 403,
        description: 'Insufficient permissions or not managing this agent',
    })
    @ApiResponse({ status: 404, description: 'Agent not found' })
    async updateAgentLeaveStatus(
        @Param('id', ParseUUIDPipe) agentId: string,
        @Body('isOnLeave') isOnLeave: boolean,
        @CurrentUser() currentUser: AuthenticatedUser
    ) {
        this.logger.log(
            `Team lead ${currentUser.id} updating leave status for agent ${agentId} to ${isOnLeave}`
        );
        const user = await this.usersService.updateAgentLeaveStatus(
            currentUser.id,
            agentId,
            isOnLeave
        );
        return this.ok(user);
    }

    @Get(':id')
    @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.AGENT, UserRole.VIEWER)
    @ApiOperation({
        summary: 'Get user by ID',
        description:
            'Retrieve a specific user by their ID. Users can view their own profile or higher roles can view others',
    })
    @ApiParam({ name: 'id', description: 'User UUID' })
    @ApiResponse({ status: 200, description: 'User retrieved successfully', type: User })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 403, description: 'Insufficient permissions' })
    @ApiResponse({ status: 404, description: 'User not found' })
    async getUserById(
        @Param('id', ParseUUIDPipe) id: string,
        @CurrentUser() currentUser: AuthenticatedUser
    ) {
        if (!this.usersService.canUserManageUser(currentUser, id) && currentUser.id !== id) {
            throw new ForbiddenException(
                'You can only view your own profile or profiles you have permission to manage'
            );
        }
        const user = await this.usersService.getUserById(id);
        return this.ok(user);
    }

    @Put(':id')
    @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.AGENT, UserRole.VIEWER)
    @ApiOperation({
        summary: 'Update user',
        description:
            'Update user information. Users can update their own profile or higher roles can update others',
    })
    @ApiParam({ name: 'id', description: 'User UUID' })
    @ApiBody({ type: UpdateUserDto })
    @ApiResponse({ status: 200, description: 'User updated successfully', type: User })
    @ApiResponse({ status: 400, description: 'Invalid input data' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 403, description: 'Insufficient permissions' })
    @ApiResponse({ status: 404, description: 'User not found' })
    @ApiResponse({ status: 409, description: 'Email or employee number already exists' })
    async updateUser(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() updateUserDto: UpdateUserDto,
        @CurrentUser() currentUser: AuthenticatedUser
    ) {
        if (!this.usersService.canUserManageUser(currentUser, id) && currentUser.id !== id) {
            throw new ForbiddenException(
                'You can only update your own profile or profiles you have permission to manage'
            );
        }

        if (updateUserDto.role || updateUserDto.status) {
            if (currentUser.role !== UserRole.ADMIN && currentUser.role !== UserRole.MANAGER) {
                throw new ForbiddenException(
                    'Only Admin and Manager roles can update user roles or status'
                );
            }
            if (currentUser.role === UserRole.MANAGER && updateUserDto.role === UserRole.ADMIN) {
                throw new ForbiddenException('Managers cannot assign Admin role');
            }
        }

        const updated = await this.usersService.updateUser(id, updateUserDto, currentUser);
        return this.ok(updated);
    }

    @Delete(':id')
    @Roles(UserRole.ADMIN, UserRole.MANAGER)
    @ApiOperation({
        summary: 'Delete user',
        description: 'Soft delete a user account. Only Admin and Manager roles can delete users',
    })
    @ApiParam({ name: 'id', description: 'User UUID' })
    @ApiResponse({ status: 204, description: 'User deleted successfully' })
    @ApiResponse({ status: 400, description: 'Cannot delete own account' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 403, description: 'Insufficient permissions' })
    @ApiResponse({ status: 404, description: 'User not found' })
    async deleteUser(
        @Param('id', ParseUUIDPipe) id: string,
        @CurrentUser() currentUser: AuthenticatedUser
    ) {
        await this.usersService.deleteUser(id, currentUser);
        return this.ok({ message: 'User deleted successfully' });
    }

    @Put(':id/change-password')
    @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.AGENT, UserRole.VIEWER)
    @ApiOperation({
        summary: 'Change user password',
        description: 'Change password for a user. Users can change their own password',
    })
    @ApiParam({ name: 'id', description: 'User UUID' })
    @ApiBody({ type: ChangePasswordDto })
    @ApiResponse({
        status: 200,
        description: 'Password changed successfully',
        content: { 'application/json': { example: { message: 'Password changed successfully' } } },
    })
    @ApiResponse({ status: 400, description: 'Invalid current password or validation failed' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 403, description: 'Insufficient permissions' })
    @ApiResponse({ status: 404, description: 'User not found' })
    async changePassword(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() changePasswordDto: ChangePasswordDto,
        @CurrentUser() currentUser: AuthenticatedUser
    ) {
        if (currentUser.id !== id && currentUser.role !== UserRole.ADMIN) {
            throw new ForbiddenException('You can only change your own password');
        }
        await this.usersService.changePassword(id, changePasswordDto);
        return this.ok({ message: 'Password changed successfully' });
    }

    @Post('request-password-reset')
    @ApiOperation({
        summary: 'Request password reset',
        description:
            'Request a password reset link to be sent to the user email. This endpoint does not require authentication',
    })
    @ApiBody({ type: RequestPasswordResetDto })
    @ApiResponse({ status: 200, description: 'Password reset email sent (if email exists)' })
    @ApiResponse({ status: 400, description: 'Invalid email format' })
    async requestPasswordReset(@Body() dto: RequestPasswordResetDto) {
        const res = await this.usersService.requestPasswordReset(dto);
        return this.ok(res);
    }

    @Post('reset-password')
    @ApiOperation({
        summary: 'Reset password with token',
        description:
            'Reset password using a reset token received via email. This endpoint does not require authentication',
    })
    @ApiBody({ type: ResetPasswordDto })
    @ApiResponse({ status: 200, description: 'Password reset successfully' })
    @ApiResponse({ status: 400, description: 'Invalid or expired token, or validation failed' })
    async resetPassword(@Body() dto: ResetPasswordDto) {
        const res = await this.usersService.resetPassword(dto);
        return this.ok(res);
    }

    @Post('reset-password/validate')
    @ApiOperation({
        summary: 'Validate reset password token',
        description:
            'Validate a password reset token before allowing the user to choose a new password',
    })
    @ApiBody({ type: ValidateResetTokenDto })
    @ApiResponse({ status: 200, description: 'Token is valid' })
    @ApiResponse({ status: 400, description: 'Invalid or expired reset token' })
    async validateResetToken(@Body() dto: ValidateResetTokenDto) {
        const res = await this.usersService.validatePasswordResetToken(dto);
        return this.ok(res);
    }
}

// Public password reset controller (no auth required)
@ApiTags('Public - Password Reset')
@Controller('public/users')
export class PublicUsersController {
    private readonly logger = new Logger(PublicUsersController.name);

    constructor(private readonly usersService: UsersService) {}

    private ok<T>(data: T) {
        return {
            success: true,
            data,
            meta: { timestamp: new Date().toISOString(), version: '1.0.0' },
        };
    }

    @Post('request-password-reset')
    @ApiOperation({
        summary: 'Request password reset (Public)',
        description:
            'Request a password reset link to be sent to the user email. This is a public endpoint.',
    })
    @ApiBody({ type: RequestPasswordResetDto })
    @ApiResponse({ status: 200, description: 'Password reset email sent (if email exists)' })
    @ApiResponse({ status: 400, description: 'Invalid email format' })
    async requestPasswordReset(@Body() dto: RequestPasswordResetDto) {
        const res = await this.usersService.requestPasswordReset(dto);
        return this.ok(res);
    }

    @Post('reset-password')
    @ApiOperation({
        summary: 'Reset password with token (Public)',
        description:
            'Reset password using a reset token received via email. This is a public endpoint.',
    })
    @ApiBody({ type: ResetPasswordDto })
    @ApiResponse({ status: 200, description: 'Password reset successfully' })
    @ApiResponse({ status: 400, description: 'Invalid or expired token, or validation failed' })
    async resetPassword(@Body() dto: ResetPasswordDto) {
        const res = await this.usersService.resetPassword(dto);
        return this.ok(res);
    }

    @Post('reset-password/validate')
    @ApiOperation({
        summary: 'Validate reset password token (Public)',
        description:
            'Validate a password reset token before allowing the user to choose a new password. Public endpoint.',
    })
    @ApiBody({ type: ValidateResetTokenDto })
    @ApiResponse({ status: 200, description: 'Token is valid' })
    @ApiResponse({ status: 400, description: 'Invalid or expired reset token' })
    async validateResetToken(@Body() dto: ValidateResetTokenDto) {
        const res = await this.usersService.validatePasswordResetToken(dto);
        return this.ok(res);
    }
}
