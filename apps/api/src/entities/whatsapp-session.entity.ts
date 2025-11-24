import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from './base.entity';

export enum WhatsAppSessionStatus {
    DISCONNECTED = 'disconnected',
    CONNECTING = 'connecting',
    CONNECTED = 'connected',
    QR_CODE = 'qr_code',
    FAILED = 'failed',
}

@Entity('whatsapp_sessions')
@Index(['status'])
export class WhatsAppSession extends BaseEntity {
    @Column({ type: 'varchar', length: 100, name: 'session_name', unique: true })
    sessionName!: string;

    @Column({
        type: 'varchar',
        length: 20,
        default: WhatsAppSessionStatus.DISCONNECTED,
    })
    status!: WhatsAppSessionStatus;

    @Column({ type: 'varchar', length: 20, name: 'phone_number', nullable: true })
    phoneNumber?: string;

    @Column({ type: 'text', name: 'qr_code', nullable: true })
    qrCode?: string;

    @Column({ type: 'datetime', name: 'last_connected_at', nullable: true })
    lastConnectedAt?: Date;

    @Column({ type: 'datetime', name: 'last_disconnected_at', nullable: true })
    lastDisconnectedAt?: Date;

    @Column({ type: 'text', name: 'error_message', nullable: true })
    errorMessage?: string;

    @Column({ type: 'json', nullable: true })
    metadata?: Record<string, unknown>;
}
