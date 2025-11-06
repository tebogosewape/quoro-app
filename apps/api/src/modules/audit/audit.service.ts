import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditAction, AuditActorType, AuditLog } from '../../entities/audit-log.entity';

type LogEventInput = {
    action: AuditAction;
    entityType: string;
    entityId?: string;
    actorId?: string;
    actorType?: AuditActorType;
    traceId?: string;
    metadata?: Record<string, unknown>;
    changes?: Record<string, unknown>;
};

@Injectable()
export class AuditService {
    private readonly logger = new Logger(AuditService.name);

    constructor(
        @InjectRepository(AuditLog)
        private readonly auditRepository: Repository<AuditLog>
    ) {}

    async logEvent(input: LogEventInput): Promise<void> {
        const { action, entityType, entityId, actorId, actorType, traceId, metadata, changes } =
            input;

        const record = this.auditRepository.create({
            action,
            entityType,
            entityId: entityId ?? 'unknown',
            actorId: actorId ?? undefined,
            actorType: actorType ?? (actorId ? AuditActorType.USER : AuditActorType.SYSTEM),
            traceId: traceId ?? undefined,
            metadata: metadata ?? undefined,
            changes: changes ?? undefined,
            createdBy: actorId ?? undefined,
            updatedBy: actorId ?? undefined,
        });

        try {
            await this.auditRepository.save(record);
        } catch (error) {
            this.logger.error(
                'Failed to persist audit log',
                error instanceof Error ? error.stack : undefined
            );
        }
    }

    async logLoginSuccess(params: {
        userId: string;
        metadata?: Record<string, unknown>;
    }): Promise<void> {
        const { userId, metadata } = params;

        await this.logEvent({
            action: AuditAction.LOGIN_SUCCESS,
            entityType: 'user',
            entityId: userId,
            actorId: userId,
            actorType: AuditActorType.USER,
            metadata,
        });
    }

    async logLoginFailure(params: {
        identifier: string;
        userId?: string;
        metadata?: Record<string, unknown>;
    }): Promise<void> {
        const { identifier, userId, metadata } = params;

        await this.logEvent({
            action: AuditAction.LOGIN_FAILURE,
            entityType: 'user',
            entityId: userId ?? 'unknown',
            actorId: userId ?? undefined,
            actorType: userId ? AuditActorType.USER : AuditActorType.SYSTEM,
            metadata: {
                identifier,
                ...(metadata ?? {}),
            },
        });
    }

    async logPasswordResetRequested(params: {
        userId: string;
        tokenExpiresAt?: Date;
        metadata?: Record<string, unknown>;
    }): Promise<void> {
        const { userId, tokenExpiresAt, metadata } = params;

        await this.logEvent({
            action: AuditAction.PASSWORD_RESET_REQUEST,
            entityType: 'user',
            entityId: userId,
            actorId: userId,
            actorType: AuditActorType.USER,
            metadata: {
                tokenExpiresAt: tokenExpiresAt?.toISOString() ?? undefined,
                ...(metadata ?? {}),
            },
        });
    }

    async logPasswordResetCompleted(params: {
        userId: string;
        metadata?: Record<string, unknown>;
    }): Promise<void> {
        const { userId, metadata } = params;

        await this.logEvent({
            action: AuditAction.PASSWORD_RESET_COMPLETE,
            entityType: 'user',
            entityId: userId,
            actorId: userId,
            actorType: AuditActorType.USER,
            metadata,
        });
    }
}
