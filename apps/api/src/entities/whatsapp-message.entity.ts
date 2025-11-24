import { Entity, Column, Index, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Client } from './client.entity';
import { User } from './user.entity';

export enum WhatsAppMessageStatus {
    PENDING = 'pending',
    SENT = 'sent',
    DELIVERED = 'delivered',
    READ = 'read',
    FAILED = 'failed',
}

export enum WhatsAppMessageDirection {
    INBOUND = 'inbound',
    OUTBOUND = 'outbound',
}

@Entity('whatsapp_messages')
@Index(['clientId'])
@Index(['status'])
@Index(['createdAt'])
export class WhatsAppMessage extends BaseEntity {
    @Column({ type: 'varchar', length: 36, name: 'client_id' })
    clientId!: string;

    @ManyToOne(() => Client, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'client_id' })
    client?: Client;

    @Column({ type: 'varchar', length: 36, name: 'user_id', nullable: true })
    userId?: string;

    @ManyToOne(() => User, { onDelete: 'SET NULL' })
    @JoinColumn({ name: 'user_id' })
    user?: User;

    @Column({
        type: 'varchar',
        length: 20,
        default: WhatsAppMessageDirection.OUTBOUND,
    })
    direction!: WhatsAppMessageDirection;

    @Column({
        type: 'varchar',
        length: 20,
        default: WhatsAppMessageStatus.PENDING,
    })
    status!: WhatsAppMessageStatus;

    @Column({ type: 'varchar', length: 20, name: 'from_number' })
    fromNumber!: string;

    @Column({ type: 'varchar', length: 20, name: 'to_number' })
    toNumber!: string;

    @Column({ type: 'text', nullable: true })
    message?: string;

    @Column({ type: 'varchar', length: 255, name: 'media_url', nullable: true })
    mediaUrl?: string;

    @Column({ type: 'varchar', length: 100, name: 'media_mime_type', nullable: true })
    mediaMimeType?: string;

    @Column({ type: 'varchar', length: 255, name: 'media_filename', nullable: true })
    mediaFilename?: string;

    @Column({ type: 'varchar', length: 255, name: 'whatsapp_message_id', nullable: true })
    whatsappMessageId?: string;

    @Column({ type: 'datetime', name: 'sent_at', nullable: true })
    sentAt?: Date;

    @Column({ type: 'datetime', name: 'delivered_at', nullable: true })
    deliveredAt?: Date;

    @Column({ type: 'datetime', name: 'read_at', nullable: true })
    readAt?: Date;

    @Column({ type: 'text', name: 'error_message', nullable: true })
    errorMessage?: string;

    @Column({ type: 'json', nullable: true })
    metadata?: Record<string, unknown>;
}
