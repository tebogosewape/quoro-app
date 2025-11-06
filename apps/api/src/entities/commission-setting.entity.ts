/* eslint-disable indent */
import { Entity, Column, Unique } from 'typeorm';
import { BaseEntity } from './base.entity';

@Entity('commission_settings')
@Unique(['singletonKey'])
export class CommissionSetting extends BaseEntity {
    // Enforce a single row by a unique constant key
    @Column({ type: 'varchar', length: 32, default: 'global', name: 'singleton_key' })
    singletonKey!: string;

    // Commission percentage (0..100), default 10
    @Column({ type: 'decimal', precision: 5, scale: 2, default: 10.0, name: 'percentage' })
    percentage!: string; // keep as string to avoid float rounding in MySQL decimal
}
