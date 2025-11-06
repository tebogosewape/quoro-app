/* eslint-disable indent */
import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from './base.entity';

export enum SmsDirection {
    OUTBOUND = 'outbound',
    INBOUND = 'inbound',
}
export enum SmsStatus {
    QUEUED = 'queued',
    SENT = 'sent',
    DELIVERED = 'delivered',
    FAILED = 'failed',
    UNKNOWN = 'unknown',
}

@Entity('sms_messages')
export class SmsMessage extends BaseEntity {
    @Column({ type: 'varchar', length: 20 }) direction!: SmsDirection;

    @Index()
    @Column({ type: 'varchar', length: 32, nullable: true })
    zoomMessageId?: string;

    @Index()
    @Column({ type: 'varchar', length: 32, nullable: true })
    repliedToMessageId?: string;

    @Column({ type: 'varchar', length: 32, nullable: true })
    to?: string;

    @Column({ type: 'varchar', length: 32, nullable: true })
    from?: string;

    @Column({ type: 'text', nullable: true })
    message?: string;

    @Column({ type: 'varchar', length: 24, default: SmsStatus.UNKNOWN })
    status!: SmsStatus;

    @Column({ type: 'varchar', length: 128, nullable: true })
    campaign?: string;

    @Column({ type: 'varchar', length: 128, nullable: true })
    dataField?: string;

    @Column({ type: 'datetime', nullable: true })
    sentAt?: Date;

    @Column({ type: 'datetime', nullable: true })
    deliveredAt?: Date;

    @Column({ type: 'json', nullable: true })
    providerPayload?: Record<string, unknown>;
}
