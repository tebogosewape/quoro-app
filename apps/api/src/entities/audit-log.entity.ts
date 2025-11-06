import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from './base.entity';
import { User } from './user.entity';

export enum AuditAction {
    CREATE = 'create',
    UPDATE = 'update',
    DELETE = 'delete',
    STATUS_CHANGE = 'status_change',
    NOTE_ADDED = 'note_added',
    TASK_COMPLETED = 'task_completed',
    COMMUNICATION_SENT = 'communication_sent',
    LOGIN_SUCCESS = 'login_success',
    LOGIN_FAILURE = 'login_failure',
    PASSWORD_RESET_REQUEST = 'password_reset_request',
    PASSWORD_RESET_COMPLETE = 'password_reset_complete',
}

export enum AuditActorType {
    USER = 'user',
    SYSTEM = 'system',
    EXTERNAL = 'external',
}

@Entity('audit_logs')
@Index(['entityType', 'entityId'])
@Index(['actorId'])
@Index(['createdAt'])
export class AuditLog extends BaseEntity {
    @Column({
        type: 'varchar',
        length: 100,
        name: 'entity_type',
        comment: 'Entity type affected (e.g. client, task)',
    })
    entityType!: string;

    @Column({
        type: 'varchar',
        length: 36,
        name: 'entity_id',
        comment: 'ID of the entity affected',
    })
    entityId!: string;

    @Column({
        type: 'varchar',
        length: 50,
        comment: 'Action that occurred',
    })
    action!: AuditAction;

    @Column({
        type: 'varchar',
        length: 36,
        nullable: true,
        name: 'actor_id',
        comment: 'ID of the actor who triggered the event',
    })
    actorId?: string;

    @Column({
        type: 'varchar',
        length: 20,
        nullable: true,
        name: 'actor_type',
        comment: 'Type of actor (user/system/external)',
    })
    actorType?: AuditActorType;

    @Column({
        type: 'simple-json',
        nullable: true,
        name: 'changes',
        comment: 'Snapshot of before/after state or diff payload',
    })
    changes?: Record<string, unknown>;

    @Column({
        type: 'simple-json',
        nullable: true,
        comment: 'Additional metadata (request ids, ip, etc.)',
    })
    metadata?: Record<string, unknown>;

    @Column({
        type: 'varchar',
        length: 64,
        nullable: true,
        name: 'trace_id',
        comment: 'Trace identifier for distributed logging',
    })
    traceId?: string;

    // Relationships
    @ManyToOne(() => User, (user) => user.auditLogs, {
        nullable: true,
        onDelete: 'SET NULL',
    })
    @JoinColumn({ name: 'actor_id' })
    actor?: User;
}
