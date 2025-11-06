import { Injectable, UnauthorizedException, Logger, Optional } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { User, UserStatus } from '../entities/user.entity';
import {
    LoginRequest,
    LoginResponse,
    JwtPayload,
    AuthenticatedUser,
    RefreshTokenResponse,
} from './auth.types';
import { AuditService } from '../modules/audit/audit.service';

// === RBAC entities (adjust import paths if needed) ===
import { Role } from '../entities/roles.entity';
import { Permission } from '../entities/permissions.entity';
import { RolePermission } from '../entities/role-permission.entity';

@Injectable()
export class AuthService {
    private readonly logger = new Logger(AuthService.name);

    constructor(
        @InjectRepository(User)
        private userRepository: Repository<User>,
        private jwtService: JwtService,
        private configService: ConfigService,
        @Optional() private readonly auditService?: AuditService,

        // Make RBAC repos optional so manual `new` still compiles
        @Optional() @InjectRepository(Role) private roleRepo?: Repository<Role>,
        @Optional() @InjectRepository(Permission) private permRepo?: Repository<Permission>,
        @Optional()
        @InjectRepository(RolePermission)
        private rolePermRepo?: Repository<RolePermission>
    ) {}

    // --------------------------
    // RBAC: resolve permissions
    // --------------------------
    // private async getPermissionsForUser(user: User): Promise<string[]> {
    //     // Match users.role (enum string) to roles.slug
    //     if (!this.roleRepo) return [];
    //     const role = await this.roleRepo.findOne({ where: { slug: user.role } });
    //     if (!role || !this.rolePermRepo) return [];

    //     const links = await this.rolePermRepo.find({
    //         where: { roleId: role.id },
    //         relations: ['permission'],
    //     });

    //     // Deduplicate, just in case
    //     const keys = new Set<string>();
    //     for (const link of links) {
    //         if (link.permission?.key) keys.add(link.permission.key);
    //     }
    //     return Array.from(keys);
    // }

    // Helper to build the session user object consistently
    private async toAuthenticatedUser(user: User): Promise<AuthenticatedUser> {
        const permissions = await this.getPermissionsForUser(user);

        return {
            id: user.id,
            email: user.email,
            username: user.username ?? undefined,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role,
            department: user.department,
            phoneNumber: user.phoneNumber ?? undefined,
            permissions,
        };
    }

    // Helper to create JWT payload consistently
    private buildJwtPayload(u: AuthenticatedUser): JwtPayload {
        // Be mindful of JWT size. If your permission list grows large, consider trimming this
        // and fetching permissions via /me when needed. For now we include them for convenience.
        return {
            sub: u.id,
            email: u.email,
            role: u.role,
            department: u.department,
            perms: u.permissions ?? [],
        };
    }

    /**
     * Validate user credentials and return user if valid
     */
    async validateUser(identifier: string, password: string): Promise<AuthenticatedUser | null> {
        try {
            const trimmedIdentifier = identifier.trim();
            const normalizedIdentifier = trimmedIdentifier.toLowerCase();
            const sanitizedPhone = trimmedIdentifier.replace(/[^\d]/g, '');

            const parameters: Record<string, string> = {
                identifierLower: normalizedIdentifier,
                identifierRaw: trimmedIdentifier,
            };

            let whereClause =
                '(LOWER(user.email) = :identifierLower OR LOWER(user.username) = :identifierLower OR user.phoneNumber = :identifierRaw';

            if (sanitizedPhone && sanitizedPhone !== trimmedIdentifier) {
                whereClause +=
                    " OR REPLACE(REPLACE(REPLACE(user.phoneNumber, ' ', ''), '-', ''), '+', '') = :identifierPhone";
                parameters.identifierPhone = sanitizedPhone;
            }
            whereClause += ')';

            const user = await this.userRepository
                .createQueryBuilder('user')
                .addSelect(['user.password', 'user.failedLoginAttempts', 'user.lockedUntil'])
                .where(whereClause, parameters)
                .andWhere('user.status = :status', { status: UserStatus.ACTIVE })
                .getOne();

            if (!user) {
                this.logger.warn(`Login attempt for non-existent identifier: ${identifier}`);
                if (this.auditService) {
                    await this.auditService.logLoginFailure({
                        identifier: normalizedIdentifier,
                        metadata: { reason: 'user_not_found' },
                    });
                }
                return null;
            }

            // Check if password matches
            const isPasswordValid = await user.validatePassword(password);
            if (!isPasswordValid) {
                this.logger.warn(`Invalid password attempt for identifier: ${identifier}`);
                if (this.auditService) {
                    await this.auditService.logLoginFailure({
                        identifier: normalizedIdentifier,
                        userId: user.id,
                        metadata: { reason: 'invalid_password' },
                    });
                }
                return null;
            }

            // Update last login
            user.updateLastLogin();
            await this.userRepository.save(user);

            this.logger.log(`User ${user.email} logged in successfully`);

            return this.toAuthenticatedUser(user);
        } catch (error) {
            this.logger.error(`Error validating user ${identifier}:`, error);
            if (this.auditService) {
                await this.auditService.logLoginFailure({
                    identifier,
                    metadata: {
                        reason: 'exception',
                        message: error instanceof Error ? error.message : 'Unknown error',
                    },
                });
            }
            return null;
        }
    }

    /**
     * Generate JWT access and refresh tokens
     */
    async login(loginRequest: LoginRequest): Promise<LoginResponse> {
        const { identifier, password } = loginRequest;

        const authed = await this.validateUser(identifier, password);
        if (!authed) {
            throw new UnauthorizedException('Invalid credentials');
        }

        const payload = this.buildJwtPayload(authed);

        // Get expiration times - convert to number if string
        const accessTokenExpiresInRaw = this.configService.get<string | number>(
            'JWT_ACCESS_EXPIRES_IN',
            900
        );
        const accessTokenExpiresIn =
            typeof accessTokenExpiresInRaw === 'string'
                ? parseInt(accessTokenExpiresInRaw, 10)
                : accessTokenExpiresInRaw;

        const refreshTokenExpiresInRaw = this.configService.get<string | number>(
            'JWT_REFRESH_EXPIRES_IN',
            604800
        );
        const refreshTokenExpiresIn =
            typeof refreshTokenExpiresInRaw === 'string'
                ? parseInt(refreshTokenExpiresInRaw, 10)
                : refreshTokenExpiresInRaw;

        this.logger.debug(
            `Login - JWT expires in: ${accessTokenExpiresIn} seconds (${accessTokenExpiresIn / 3600} hours)`
        );

        const accessToken = this.jwtService.sign(payload, { expiresIn: accessTokenExpiresIn });
        const refreshToken = this.jwtService.sign(payload, { expiresIn: refreshTokenExpiresIn });

        // Store refresh token hash in database (for security)
        const refreshTokenHash = await bcrypt.hash(refreshToken, 10);
        await this.userRepository.update(authed.id, { refreshTokenHash });

        if (this.auditService) {
            await this.auditService.logLoginSuccess({
                userId: authed.id,
                metadata: { identifier },
            });
        }

        return {
            access_token: accessToken,
            refresh_token: refreshToken,
            user: authed, // includes permissions
            expires_in: accessTokenExpiresIn,
        };
    }

    /**
     * Refresh access token using refresh token
     */
    async refreshToken(refreshToken: string): Promise<RefreshTokenResponse> {
        try {
            const payload = this.jwtService.verify(refreshToken) as JwtPayload;

            const user = await this.userRepository.findOne({
                where: { id: payload.sub, status: UserStatus.ACTIVE },
            });

            if (!user || !user.refreshTokenHash) {
                throw new UnauthorizedException('Invalid refresh token');
            }

            // Verify refresh token matches stored hash
            const isRefreshTokenValid = await bcrypt.compare(refreshToken, user.refreshTokenHash);
            if (!isRefreshTokenValid) {
                throw new UnauthorizedException('Invalid refresh token');
            }

            // Re-resolve permissions at refresh time (so role changes take effect)
            const authed = await this.toAuthenticatedUser(user);
            const newPayload = this.buildJwtPayload(authed);

            // Get expiration time - convert to number if string
            const accessTokenExpiresInRaw = this.configService.get<string | number>(
                'JWT_ACCESS_EXPIRES_IN',
                900
            );
            const accessTokenExpiresIn =
                typeof accessTokenExpiresInRaw === 'string'
                    ? parseInt(accessTokenExpiresInRaw, 10)
                    : accessTokenExpiresInRaw;

            this.logger.debug(
                `Refresh - JWT expires in: ${accessTokenExpiresIn} seconds (${accessTokenExpiresIn / 3600} hours)`
            );

            const newAccessToken = this.jwtService.sign(newPayload, {
                expiresIn: accessTokenExpiresIn,
            });

            this.logger.log(`Access token refreshed for user: ${user.email}`);

            return {
                access_token: newAccessToken,
                expires_in: accessTokenExpiresIn,
            };
        } catch (error) {
            this.logger.warn(
                `Invalid refresh token attempt:`,
                error instanceof Error ? error.message : 'Unknown error'
            );
            throw new UnauthorizedException('Invalid refresh token');
        }
    }

    /**
     * Logout user and invalidate refresh token
     */
    async logout(userId: string): Promise<void> {
        const user = await this.userRepository.findOne({ where: { id: userId } });
        if (user) {
            user.refreshTokenHash = undefined;
            await this.userRepository.save(user);
        }
        this.logger.log(`User ${userId} logged out successfully`);
    }

    /**
     * Get user profile by ID (resolved with permissions)
     */
    async getProfile(userId: string): Promise<AuthenticatedUser | null> {
        const user = await this.userRepository.findOne({
            where: { id: userId, status: UserStatus.ACTIVE },
        });
        if (!user) return null;
        return this.toAuthenticatedUser(user);
    }

    /**
     * Verify JWT payload for guards (ensure user still active; rehydrate profile)
     */
    async verifyPayload(payload: JwtPayload): Promise<AuthenticatedUser | null> {
        // We could trust token claims, but re-reading ensures status changes (suspension) are respected.
        return this.getProfile(payload.sub);
    }

    // in AuthService
    private async getPermissionsForUser(user: User): Promise<string[]> {
        if (!this.roleRepo || !this.rolePermRepo) return [];

        // match regardless of case
        const role = await this.roleRepo
            .createQueryBuilder('r')
            .where('LOWER(r.slug) = :slug', { slug: String(user.role).toLowerCase() })
            .getOne();

        if (!role) {
            this.logger.warn(`RBAC: role not found for slug ${user.role}`);
            return [];
        }

        // fetch keys with an explicit join (no relations required)
        const rows = await this.rolePermRepo
            .createQueryBuilder('rp')
            .innerJoin(Permission, 'p', 'p.id = rp.permissionId')
            .where('rp.roleId = :roleId', { roleId: role.id })
            .select('p.key', 'key')
            .getRawMany<{ key: string }>();

        return Array.from(new Set(rows.map((r) => r.key))).filter(Boolean);
    }
}
