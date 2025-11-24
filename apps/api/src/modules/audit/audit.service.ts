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

    /**
     * Get communication logs for a specific client
     */
    async getClientCommunications(clientId: string): Promise<AuditLog[]> {
        return this.auditRepository.find({
            where: {
                entityType: 'client_communication',
                entityId: clientId,
            },
            order: {
                createdAt: 'DESC',
            },
        });
    }

    /**
     * Log lead assignment action
     */
    async logLeadAssigned(params: {
        leadId: string;
        agentId: string;
        agentName: string;
        assignedBy: string;
        metadata?: Record<string, unknown>;
    }): Promise<void> {
        const { leadId, agentId, agentName, assignedBy, metadata } = params;

        await this.logEvent({
            action: AuditAction.LEAD_ASSIGNED,
            entityType: 'lead',
            entityId: leadId,
            actorId: assignedBy,
            actorType: AuditActorType.USER,
            metadata: {
                agentId,
                agentName,
                ...(metadata ?? {}),
            },
        });
    }

    /**
     * Log lead unassignment action
     */
    async logLeadUnassigned(params: {
        leadId: string;
        previousAgentName: string;
        unassignedBy: string;
        metadata?: Record<string, unknown>;
    }): Promise<void> {
        const { leadId, previousAgentName, unassignedBy, metadata } = params;

        await this.logEvent({
            action: AuditAction.LEAD_UNASSIGNED,
            entityType: 'lead',
            entityId: leadId,
            actorId: unassignedBy,
            actorType: AuditActorType.USER,
            metadata: {
                previousAgentName,
                ...(metadata ?? {}),
            },
        });
    }

    /**
     * Log bulk lead assignment
     */
    async logLeadBulkAssigned(params: {
        leadIds: string[];
        agentId: string;
        agentName: string;
        assignedBy: string;
        metadata?: Record<string, unknown>;
    }): Promise<void> {
        const { leadIds, agentId, agentName, assignedBy, metadata } = params;

        await this.logEvent({
            action: AuditAction.LEAD_BULK_ASSIGNED,
            entityType: 'lead',
            entityId: leadIds[0] || 'bulk_operation',
            actorId: assignedBy,
            actorType: AuditActorType.USER,
            metadata: {
                leadIds,
                leadCount: leadIds.length,
                agentId,
                agentName,
                ...(metadata ?? {}),
            },
        });
    }

    /**
     * Log bulk lead unassignment
     */
    async logLeadBulkUnassigned(params: {
        leadIds: string[];
        agentName: string;
        unassignedBy: string;
        metadata?: Record<string, unknown>;
    }): Promise<void> {
        const { leadIds, agentName, unassignedBy, metadata } = params;

        await this.logEvent({
            action: AuditAction.LEAD_BULK_UNASSIGNED,
            entityType: 'lead',
            entityId: leadIds[0] || 'bulk_operation',
            actorId: unassignedBy,
            actorType: AuditActorType.USER,
            metadata: {
                leadIds,
                leadCount: leadIds.length,
                agentName,
                ...(metadata ?? {}),
            },
        });
    }

    /**
     * Log when agent views a lead
     */
    async logLeadViewed(params: {
        leadId: string;
        agentId: string;
        metadata?: Record<string, unknown>;
    }): Promise<void> {
        const { leadId, agentId, metadata } = params;

        await this.logEvent({
            action: AuditAction.LEAD_VIEWED,
            entityType: 'lead',
            entityId: leadId,
            actorId: agentId,
            actorType: AuditActorType.USER,
            metadata,
        });
    }

    /**
     * Log onboarding step completion
     */
    async logOnboardingStep(params: {
        clientId?: string;
        step: string;
        agentId: string;
        metadata?: Record<string, unknown>;
    }): Promise<void> {
        const { clientId, step, agentId, metadata } = params;

        await this.logEvent({
            action: AuditAction.ONBOARDING_STEP_COMPLETED,
            entityType: 'client_onboarding',
            entityId: clientId || 'in_progress',
            actorId: agentId,
            actorType: AuditActorType.USER,
            metadata: {
                step,
                ...(metadata ?? {}),
            },
        });
    }

    /**
     * Log client field update with before/after values
     */
    async logClientFieldUpdate(params: {
        clientId: string;
        field: string;
        oldValue: unknown;
        newValue: unknown;
        updatedBy: string;
        metadata?: Record<string, unknown>;
    }): Promise<void> {
        const { clientId, field, oldValue, newValue, updatedBy, metadata } = params;

        await this.logEvent({
            action: AuditAction.CLIENT_FIELD_UPDATED,
            entityType: 'client',
            entityId: clientId,
            actorId: updatedBy,
            actorType: AuditActorType.USER,
            changes: {
                field,
                before: oldValue,
                after: newValue,
            },
            metadata,
        });
    }

    /**
     * Log credit report download
     */
    async logCreditReportDownload(params: {
        clientId: string;
        downloadedBy: string;
        metadata?: Record<string, unknown>;
    }): Promise<void> {
        const { clientId, downloadedBy, metadata } = params;

        await this.logEvent({
            action: AuditAction.CREDIT_REPORT_DOWNLOADED,
            entityType: 'client',
            entityId: clientId,
            actorId: downloadedBy,
            actorType: AuditActorType.USER,
            metadata,
        });
    }
}
