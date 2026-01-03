import { Entity, Column, OneToMany, Index, BeforeInsert, BeforeUpdate } from 'typeorm';
import { BaseEntity } from './base.entity';
import { AuditLog } from './audit-log.entity';
import * as bcrypt from 'bcrypt';

export enum UserRole {
    ADMIN = 'admin',
    ADMIN_MANAGER = 'admin_manager',
    MANAGER = 'manager',
    TEAM_LEADER = 'team_leader',
    OPERATIONS_MANAGER = 'operations_manager',
    AGENT = 'agent',
    SALES_AGENT = 'sales_agent',
    DEBT_REVIEW_SPECIALIST = 'debt_review_specialist',
    LEAD_PROVIDER = 'lead_provider',
    CHIEF_EXECUTIVE_OFFICER = 'chief_executive_officer',
    VIEWER = 'viewer',
}

export enum UserStatus {
    ACTIVE = 'active',
    INACTIVE = 'inactive',
    SUSPENDED = 'suspended',
    PENDING = 'pending',
}

@Entity('users')
@Index(['email'], { unique: true })
@Index(['employeeNumber'], { unique: true })
@Index(['username'], { unique: true })
export class User extends BaseEntity {
    @Column({
        type: 'varchar',
        length: 100,
        comment: 'User first name',
    })
    firstName!: string;

    @Column({
        type: 'varchar',
        length: 100,
        comment: 'User last name',
    })
    lastName!: string;

    @Column({
        type: 'varchar',
        length: 255,
        unique: true,
        comment: 'User email address - must be unique',
    })
    email!: string;

    @Column({
        type: 'varchar',
        length: 100,
        nullable: true,
        unique: true,
        comment: 'Unique username that can be used to sign in',
    })
    username?: string;

    @Column({
        type: 'varchar',
        length: 255,
        select: false,
        comment: 'Hashed password',
    })
    password!: string;

    @Column({
        type: 'varchar',
        length: 20,
        unique: true,
        name: 'employee_number',
        comment: 'Unique employee identification number',
    })
    employeeNumber!: string;

    @Column({
        type: 'varchar',
        default: UserRole.SALES_AGENT,
        comment: 'User role determining access permissions',
    })
    role!: UserRole;

    @Column({
        type: 'varchar',
        default: UserStatus.PENDING,
        comment: 'Current status of the user account',
    })
    status!: UserStatus;

    @Column({
        type: 'varchar',
        length: 20,
        nullable: true,
        name: 'phone_number',
        comment: 'User phone number',
    })
    phoneNumber?: string;

    @Column({
        type: 'varchar',
        length: 100,
        nullable: true,
        comment: 'Job title or position',
    })
    title?: string;

    @Column({
        type: 'varchar',
        length: 100,
        nullable: true,
        comment: 'Department or team',
    })
    department?: string;

    @Column({
        type: 'varchar',
        length: 36,
        nullable: true,
        name: 'manager_id',
        comment: "ID of the user's manager",
    })
    managerId?: string;

    @Column({
        type: 'tinyint',
        width: 1,
        default: 0,
        name: 'is_on_leave',
        comment: 'Whether the agent is currently on leave and cannot receive new leads',
    })
    isOnLeave!: boolean;

    @Column({
        type: 'datetime',
        nullable: true,
        name: 'last_login_at',
        comment: 'Timestamp of last successful login',
    })
    lastLoginAt?: Date;

    @Column({
        type: 'datetime',
        nullable: true,
        name: 'email_verified_at',
        comment: 'Timestamp when email was verified',
    })
    emailVerifiedAt?: Date;

    @Column({
        type: 'varchar',
        length: 255,
        nullable: true,
        name: 'reset_token',
        comment: 'Password reset token',
    })
    resetToken?: string;

    @Column({
        type: 'datetime',
        nullable: true,
        name: 'reset_token_expires_at',
        comment: 'Password reset token expiration',
    })
    resetTokenExpiresAt?: Date;

    @Column({
        type: 'varchar',
        length: 500,
        nullable: true,
        name: 'refresh_token_hash',
        comment: 'Hashed refresh token for JWT authentication',
    })
    refreshTokenHash?: string;

    @Column({
        type: 'int',
        default: 0,
        name: 'failed_login_attempts',
        comment: 'Number of consecutive failed login attempts',
    })
    failedLoginAttempts!: number;

    @Column({
        type: 'datetime',
        nullable: true,
        name: 'locked_until',
        comment: 'Account locked until this timestamp',
    })
    lockedUntil?: Date;

    @Column({
        type: 'simple-json',
        nullable: true,
        comment: 'User preferences and settings',
    })
    preferences?: Record<string, unknown>;

    // Relationships
    @OneToMany('AuditLog', 'actor')
    auditLogs!: AuditLog[];

    // Virtual properties
    get fullName(): string {
        return `${this.firstName} ${this.lastName}`;
    }

    get isActive(): boolean {
        return this.status === UserStatus.ACTIVE;
    }

    get isLocked(): boolean {
        return !!(this.lockedUntil && this.lockedUntil > new Date());
    }

    // Hooks
    @BeforeInsert()
    @BeforeUpdate()
    async hashPassword(): Promise<void> {
        if (this.password && !this.password.startsWith('$2b$')) {
            const saltRounds = parseInt(process.env.BCRYPT_ROUNDS || '10', 10);
            this.password = await bcrypt.hash(this.password, saltRounds);
        }
    }

    // Methods
    async validatePassword(password: string): Promise<boolean> {
        return bcrypt.compare(password, this.password);
    }

    incrementFailedAttempts(): void {
        this.failedLoginAttempts += 1;

        // Lock account after 5 failed attempts for 15 minutes
        if (this.failedLoginAttempts >= 5) {
            this.lockedUntil = new Date(Date.now() + 15 * 60 * 1000);
        }
    }

    resetFailedAttempts(): void {
        this.failedLoginAttempts = 0;
        this.lockedUntil = undefined;
    }

    updateLastLogin(): void {
        this.lastLoginAt = new Date();
        this.resetFailedAttempts();
    }
}
