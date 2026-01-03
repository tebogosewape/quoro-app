import {
    Injectable,
    NotFoundException,
    ConflictException,
    BadRequestException,
    ForbiddenException,
    Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere, In } from 'typeorm';
import { User, UserRole, UserStatus } from '../entities/user.entity';
import { Lead } from '../entities/lead.entity';
import { Client, ClientStatus } from '../entities/client.entity';
import { AuditAction } from '../entities/audit-log.entity';
import {
    CreateUserDto,
    UpdateUserDto,
    ChangePasswordDto,
    ResetPasswordDto,
    RequestPasswordResetDto,
    ValidateResetTokenDto,
} from './users.dto';
import { AuthenticatedUser } from '../auth/auth.types';
import * as crypto from 'crypto';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { AuditService } from '../modules/audit/audit.service';

export interface UserListQuery {
    page?: number;
    limit?: number;
    search?: string;
    role?: UserRole;
    status?: UserStatus;
    department?: string;
    all?: string | boolean | number; // allow ?all=1
}

export interface UserListResponse {
    users: User[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

@Injectable()
export class UsersService {
    private readonly logger = new Logger(UsersService.name);

    constructor(
        @InjectRepository(User)
        private userRepository: Repository<User>,
        @InjectRepository(Lead)
        private leadRepository: Repository<Lead>,
        @InjectRepository(Client)
        private clientRepository: Repository<Client>,
        private readonly configService: ConfigService,
        private readonly auditService: AuditService
    ) {}

    // --- helpers ---------------------------------------------------------------

    private ensureValidRole(role?: string) {
        if (!role) return;
        const allowed = Object.values(UserRole);
        if (!allowed.includes(role as UserRole)) {
            throw new BadRequestException(`Invalid role '${role}'. Allowed: ${allowed.join(', ')}`);
        }
    }

    private ensureValidStatus(status?: string) {
        if (!status) return;
        const allowed = Object.values(UserStatus);
        if (!allowed.includes(status as UserStatus)) {
            throw new BadRequestException(
                `Invalid status '${status}'. Allowed: ${allowed.join(', ')}`
            );
        }
    }

    private stripPassword<T extends Partial<User>>(u: T): T {
        // TypeORM may not include password by default due to select:false,
        // but we defensively remove it if present
        if (u && 'password' in u) {
            const clone = { ...(u as Partial<User>) };
            delete clone.password;
            return clone as T;
        }
        return u;
    }

    // --- CRUD ------------------------------------------------------------------

    /**
     * Create a new user
     */
    async createUser(createUserDto: CreateUserDto, createdBy: AuthenticatedUser): Promise<User> {
        this.logger.log(`Creating new user: ${createUserDto.email} by ${createdBy.email}`);

        // Validate enums early
        this.ensureValidRole(createUserDto.role as string);
        this.ensureValidStatus(createUserDto.status as string);

        // Unique email
        const existingUser = await this.userRepository.findOne({
            where: { email: createUserDto.email },
        });
        if (existingUser) {
            throw new ConflictException('A user with this email already exists');
        }

        // Unique employee number
        const existingEmployeeNumber = await this.userRepository.findOne({
            where: { employeeNumber: createUserDto.employeeNumber },
        });
        if (existingEmployeeNumber) {
            throw new ConflictException('A user with this employee number already exists');
        }

        // Create entity
        const user = this.userRepository.create({
            ...createUserDto,
            // default to ACTIVE if none provided
            status: (createUserDto.status as UserStatus) ?? UserStatus.ACTIVE,
            createdBy: createdBy.id,
            updatedBy: createdBy.id,
        });

        const savedUser = await this.userRepository.save(user);
        this.logger.log(`User created successfully: ${savedUser.id}`);

        return this.stripPassword(savedUser) as User;
    }

    /**
     * Get paginated list of users with optional filters.
     * When `?all=1` is provided, returns all users (up to a sane cap).
     */
    async getUsers(query: UserListQuery): Promise<UserListResponse> {
        const allMode =
            query.all === true ||
            query.all === 'true' ||
            query.all === '1' ||
            Number(query.all) === 1;

        const defaultPage = 1;
        const defaultLimit = 10;

        const page = allMode ? 1 : Math.max(1, Number(query.page) || defaultPage);
        const rawLimit = allMode ? 1000 : Number(query.limit) || defaultLimit;
        const limit = Math.min(1000, Math.max(1, rawLimit)); // hard cap

        const skip = (page - 1) * limit;

        const whereConditions: FindOptionsWhere<User> = {};

        // Validate enums early
        this.ensureValidRole(query.role as string);
        this.ensureValidStatus(query.status as string);

        if (query.role) whereConditions.role = query.role;
        if (query.status) whereConditions.status = query.status;
        if (query.department) whereConditions.department = query.department;

        const qb = this.userRepository
            .createQueryBuilder('user')
            .where(whereConditions)
            .orderBy('user.createdAt', 'DESC');

        if (!allMode) {
            qb.skip(skip).take(limit);
        } else {
            // in allMode still enforce limit cap
            qb.take(limit);
        }

        if (query.search) {
            qb.andWhere(
                '(user.firstName LIKE :s OR user.lastName LIKE :s OR user.email LIKE :s OR user.employeeNumber LIKE :s)',
                { s: `%${query.search}%` }
            );
        }

        const [users, total] = await qb.getManyAndCount();

        const usersWithoutPasswords = users.map((u) => this.stripPassword(u)) as User[];

        return {
            users: usersWithoutPasswords,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };
    }

    /**
     * Get user by ID
     */
    async getUserById(id: string): Promise<User> {
        let user: User | null = null;

        // Some environments don’t have extra relations; try safely
        try {
            user = await this.userRepository.findOne({
                where: { id },
                relations: ['assignedClients'], // keep your original intent
            });
        } catch {
            // Fallback if relation is not mapped
            user = await this.userRepository.findOne({ where: { id } });
        }

        if (!user) {
            throw new NotFoundException('User not found');
        }

        return this.stripPassword(user) as User;
    }

    /**
     * Update user
     */
    async updateUser(
        id: string,
        updateUserDto: UpdateUserDto,
        updatedBy: AuthenticatedUser
    ): Promise<User> {
        this.logger.log(`Updating user ${id} by ${updatedBy.email}`);

        const user = await this.userRepository.findOne({ where: { id } });
        if (!user) {
            throw new NotFoundException('User not found');
        }

        // Validate enums early
        this.ensureValidRole(updateUserDto.role as string);
        this.ensureValidStatus(updateUserDto.status as string);

        // Unique email if changed
        if (updateUserDto.email && updateUserDto.email !== user.email) {
            const exists = await this.userRepository.findOne({
                where: { email: updateUserDto.email },
            });
            if (exists) {
                throw new ConflictException('A user with this email already exists');
            }
        }

        // Unique employee number if changed
        if (updateUserDto.employeeNumber && updateUserDto.employeeNumber !== user.employeeNumber) {
            const exists = await this.userRepository.findOne({
                where: { employeeNumber: updateUserDto.employeeNumber },
            });
            if (exists) {
                throw new ConflictException('A user with this employee number already exists');
            }
        }

        Object.assign(user, updateUserDto);
        user.updatedBy = updatedBy.id;

        const updatedUser = await this.userRepository.save(user);
        this.logger.log(`User updated successfully: ${updatedUser.id}`);

        return this.stripPassword(updatedUser) as User;
    }

    /**
     * Delete user (soft delete)
     */
    async deleteUser(id: string, deletedBy: AuthenticatedUser): Promise<void> {
        this.logger.log(`Deleting user ${id} by ${deletedBy.email}`);

        const user = await this.userRepository.findOne({ where: { id } });
        if (!user) throw new NotFoundException('User not found');

        if (user.id === deletedBy.id) {
            throw new BadRequestException('Cannot delete your own account');
        }

        user.deletedAt = new Date();
        user.updatedBy = deletedBy.id;
        await this.userRepository.save(user);

        this.logger.log(`User deleted successfully: ${id}`);
    }

    /**
     * Change user password
     * (Controller ensures only owner or admin reaches here.)
     */
    async changePassword(id: string, changePasswordDto: ChangePasswordDto): Promise<void> {
        this.logger.log(`Changing password for user ${id}`);

        // Need password to compare -> addSelect since column is select:false
        const user = await this.userRepository
            .createQueryBuilder('user')
            .addSelect('user.password')
            .where('user.id = :id', { id })
            .getOne();

        if (!user) throw new NotFoundException('User not found');

        const isCurrentValid = await user.validatePassword(changePasswordDto.currentPassword);
        if (!isCurrentValid) {
            throw new BadRequestException('Current password is incorrect');
        }

        user.password = changePasswordDto.newPassword;
        user.updatedBy = id;
        user.refreshTokenHash = undefined; // force re-login on other devices

        await this.userRepository.save(user);
        this.logger.log(`Password changed successfully for user ${id}`);
    }

    /**
     * Request password reset
     */
    async requestPasswordReset(
        requestPasswordResetDto: RequestPasswordResetDto
    ): Promise<{ message: string }> {
        const normalizedEmail = requestPasswordResetDto.email.toLowerCase();
        this.logger.log(`Password reset requested for: ${normalizedEmail}`);

        const user = await this.userRepository.findOne({
            where: { email: normalizedEmail },
        });

        if (!user) {
            // Don’t reveal existence
            return { message: 'If the email exists, a password reset link has been sent' };
        }

        const { token, hashedToken, expiresAt } = this.generateResetToken();

        user.resetToken = hashedToken;
        user.resetTokenExpiresAt = expiresAt;
        user.resetFailedAttempts();
        await this.userRepository.save(user);

        const appUrl =
            this.configService.get<string>('WEB_APP_URL') ||
            this.configService.get<string>('app.webAppUrl') ||
            'http://localhost:2100';
        const resetLink = this.buildResetLink(appUrl, user.email, token);

        try {
            // TODO: email integration
            this.logger.log(
                `Password reset link would be sent to: ${user.email} with link: ${resetLink}`
            );
        } catch (error) {
            this.logger.error('Failed to dispatch password reset email', error as Error);
        }

        this.logger.log(`Password reset token generated for user ${user.id}`);

        await this.auditService.logPasswordResetRequested({
            userId: user.id,
            tokenExpiresAt: expiresAt,
            metadata: { email: user.email },
        });

        return { message: 'If the email exists, a password reset link has been sent' };
    }

    /**
     * Reset password using token
     */
    async resetPassword(resetPasswordDto: ResetPasswordDto): Promise<{ message: string }> {
        const normalizedEmail = resetPasswordDto.email.toLowerCase();
        this.logger.log(`Processing password reset for ${normalizedEmail}`);

        if (
            resetPasswordDto.confirmPassword &&
            resetPasswordDto.confirmPassword !== resetPasswordDto.newPassword
        ) {
            throw new BadRequestException('Password confirmation does not match');
        }

        const hashedToken = this.hashResetToken(resetPasswordDto.token);

        const user = await this.userRepository
            .createQueryBuilder('user')
            .addSelect('user.password')
            .where('LOWER(user.email) = :email', { email: normalizedEmail })
            .andWhere('user.resetToken = :token', { token: hashedToken })
            .getOne();

        if (!user || !user.resetTokenExpiresAt || user.resetTokenExpiresAt < new Date()) {
            throw new BadRequestException('Invalid or expired reset token');
        }

        const sameAsOld = await bcrypt.compare(resetPasswordDto.newPassword, user.password);
        if (sameAsOld) {
            throw new BadRequestException(
                'New password must be different from the previous password'
            );
        }

        user.password = resetPasswordDto.newPassword;
        user.resetToken = undefined;
        user.resetTokenExpiresAt = undefined;
        user.refreshTokenHash = undefined; // force re-login
        user.resetFailedAttempts();
        user.lockedUntil = undefined;

        await this.userRepository.save(user);
        this.logger.log(`Password reset successfully for user ${user.id}`);

        await this.auditService.logPasswordResetCompleted({
            userId: user.id,
            metadata: { email: user.email },
        });

        return { message: 'Password has been reset successfully' };
    }

    async validatePasswordResetToken(
        validateResetTokenDto: ValidateResetTokenDto
    ): Promise<{ valid: true; expiresAt: Date }> {
        const normalizedEmail = validateResetTokenDto.email.toLowerCase();
        const hashedToken = this.hashResetToken(validateResetTokenDto.token);

        const user = await this.userRepository.findOne({
            where: { email: normalizedEmail, resetToken: hashedToken },
            select: ['id', 'resetTokenExpiresAt'],
        });

        if (!user || !user.resetTokenExpiresAt || user.resetTokenExpiresAt < new Date()) {
            throw new BadRequestException('Invalid or expired reset token');
        }

        return { valid: true, expiresAt: user.resetTokenExpiresAt };
    }

    /**
     * Get user statistics
     */
    async getUserStats(): Promise<{
        total: number;
        byRole: Record<string, number>;
        byStatus: Record<string, number>;
        byDepartment: Record<string, number>;
    }> {
        const users = await this.userRepository.find();

        const stats = {
            total: users.length,
            byRole: {} as Record<string, number>,
            byStatus: {} as Record<string, number>,
            byDepartment: {} as Record<string, number>,
        };

        users.forEach((u) => {
            stats.byRole[u.role] = (stats.byRole[u.role] || 0) + 1;
            stats.byStatus[u.status] = (stats.byStatus[u.status] || 0) + 1;
            if (u.department) {
                stats.byDepartment[u.department] = (stats.byDepartment[u.department] || 0) + 1;
            }
        });

        return stats;
    }

    /**
     * Check if user can perform action based on role hierarchy
     */
    canUserManageUser(actor: AuthenticatedUser, targetUserId: string): boolean {
        if (actor.role === UserRole.ADMIN) return true;
        if (actor.role === UserRole.MANAGER) return true; // validated further in controller
        return actor.id === targetUserId;
    }

    // --- reset token internals -------------------------------------------------

    private buildResetLink(baseUrl: string, email: string, token: string): string {
        const cleanBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
        const query = new URLSearchParams({ token, email }).toString();
        return `${cleanBase}/reset-password?${query}`;
    }

    private generateResetToken(): { token: string; hashedToken: string; expiresAt: Date } {
        const token = crypto.randomBytes(48).toString('hex');
        const hashedToken = this.hashResetToken(token);
        const ttlMinutes = this.configService.get<number>('PASSWORD_RESET_TTL_MINUTES', 30);
        const expiresAt = new Date(Date.now() + (ttlMinutes ?? 30) * 60 * 1000);
        return { token, hashedToken, expiresAt };
    }

    private hashResetToken(token: string): string {
        return crypto.createHash('sha256').update(token).digest('hex');
    }

    // --- Team Lead Dashboard ---------------------------------------------------

    /**
     * Get all agents managed by a team lead with their stats
     */
    async getTeamLeadAgents(teamLeadId: string) {
        this.logger.log(`Fetching agents for team lead ${teamLeadId}`);

        // Get all agents managed by this team lead
        const agents = await this.userRepository.find({
            where: {
                managerId: teamLeadId,
            },
            select: ['id', 'firstName', 'lastName', 'email', 'role', 'isOnLeave', 'employeeNumber'],
        });

        // For each agent, get their stats
        const agentsWithStats = await Promise.all(
            agents.map(async (agent) => {
                const fullName = `${agent.firstName} ${agent.lastName}`;

                // Count total leads allocated to this agent (by name)
                const totalLeads = await this.leadRepository.count({
                    where: {
                        allocatedTo: fullName,
                    },
                });

                // Count converted clients (APPROVED, ACTIVE, COMPLETED statuses)
                const totalConverted = await this.clientRepository.count({
                    where: {
                        assignedAgentId: agent.id,
                        status: In([
                            ClientStatus.APPROVED,
                            ClientStatus.ACTIVE,
                            ClientStatus.COMPLETED,
                        ]),
                    },
                });

                // Count leads by outcome status
                const hotLeads = await this.leadRepository.count({
                    where: {
                        allocatedTo: fullName,
                        leadOutcome: 'Hot Leads',
                    },
                });

                const busyLeads = await this.leadRepository.count({
                    where: {
                        allocatedTo: fullName,
                        leadOutcome: 'Busy',
                    },
                });

                const callLaterLeads = await this.leadRepository.count({
                    where: {
                        allocatedTo: fullName,
                        leadOutcome: 'Call Later',
                    },
                });

                const conversionRate = totalLeads > 0 ? (totalConverted / totalLeads) * 100 : 0;

                return {
                    id: agent.id,
                    firstName: agent.firstName,
                    lastName: agent.lastName,
                    email: agent.email,
                    role: agent.role,
                    isOnLeave: agent.isOnLeave,
                    totalLeads,
                    convertedClients: totalConverted,
                    hotLeads,
                    busyLeads,
                    callLaterLeads,
                    conversionRate: Math.round(conversionRate * 100) / 100, // 2 decimal places
                };
            })
        );

        return agentsWithStats;
    }

    /**
     * Update agent leave status (only by their team lead)
     */
    async updateAgentLeaveStatus(
        teamLeadId: string,
        agentId: string,
        isOnLeave: boolean
    ): Promise<User> {
        this.logger.log(`Updating leave status for agent ${agentId} to ${isOnLeave}`);

        // Find the agent and verify they are managed by this team lead
        const agent = await this.userRepository.findOne({
            where: {
                id: agentId,
            },
        });

        if (!agent) {
            throw new NotFoundException(`Agent with ID ${agentId} not found`);
        }

        if (agent.managerId !== teamLeadId) {
            throw new ForbiddenException('You can only manage agents assigned to you');
        }

        // Update leave status
        agent.isOnLeave = isOnLeave;
        await this.userRepository.save(agent);

        // Audit log
        await this.auditService.logEvent({
            action: AuditAction.UPDATE,
            entityType: 'User',
            entityId: agentId,
            actorId: teamLeadId,
            metadata: {
                isOnLeave,
                agentName: `${agent.firstName} ${agent.lastName}`,
                field: 'isOnLeave',
            },
        });

        return this.stripPassword(agent);
    }
}
