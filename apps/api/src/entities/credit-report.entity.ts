/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable indent */
import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    ManyToOne,
    JoinColumn,
    CreateDateColumn,
    UpdateDateColumn,
} from 'typeorm';
import { Client } from './client.entity';
import { User } from './user.entity';

/**
 * Credit Report Entity
 * Stores Experian credit report requests and responses
 */
@Entity('credit_reports')
export class CreditReport {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    // Relationships
    @Column({ type: 'uuid' })
    clientId!: string;

    @ManyToOne(() => Client)
    @JoinColumn({ name: 'clientId' })
    client!: Client;

    @Column({ type: 'uuid', nullable: true })
    requestedBy!: string | null;

    @ManyToOne(() => User, { nullable: true })
    @JoinColumn({ name: 'requestedBy' })
    requestedByUser?: User | null;

    // Experian reference
    @Column({ type: 'varchar', length: 100, unique: true })
    referenceNumber!: string;

    @CreateDateColumn()
    requestedAt!: Date;

    // Enquiry details
    @Column({ type: 'varchar', length: 100 })
    enquiryReason!: string;

    @Column({ type: 'varchar', length: 100, nullable: true })
    enquiryPurpose?: string | null; // For POPIA compliance

    @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
    enquiryAmount?: number | null;

    @Column({ type: 'varchar', length: 100, nullable: true })
    productType?: string | null;

    // Key metrics (denormalized for quick access)
    @Column({ type: 'int', nullable: true })
    creditScore?: number | null;

    @Column({ type: 'varchar', length: 50, nullable: true })
    scoreClass?: string | null; // Excellent, Good, Fair, Poor

    @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
    totalDebt!: number;

    @Column({ type: 'int', default: 0 })
    totalAccounts!: number;

    @Column({ type: 'int', default: 0 })
    overdueAccounts!: number;

    @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
    totalCreditLimit!: number;

    @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
    utilizationRate!: number; // Percentage

    // Negative information counts
    @Column({ type: 'int', default: 0 })
    judgmentCount!: number;

    @Column({ type: 'int', default: 0 })
    defaultCount!: number;

    @Column({ type: 'boolean', default: false })
    hasAdministration!: boolean;

    // Raw response data (stored as JSON)
    @Column({ type: 'json' })
    rawResponse!: Record<string, any>;

    // Status
    @Column({ type: 'enum', enum: ['success', 'error', 'pending'], default: 'pending' })
    status!: 'success' | 'error' | 'pending';

    @Column({ type: 'text', nullable: true })
    errorMessage?: string | null;

    @Column({ type: 'varchar', length: 50, nullable: true })
    errorCode?: string | null;

    // Compliance (POPIA/GDPR)
    @Column({ type: 'boolean', default: false })
    consentGiven!: boolean;

    @Column({ type: 'timestamp', nullable: true })
    consentDate?: Date | null;

    @Column({ type: 'varchar', length: 255, nullable: true })
    consentMethod?: string | null; // 'verbal', 'electronic', 'written'

    @Column({ type: 'text', nullable: true })
    purpose?: string | null; // Reason for accessing credit report

    // Data retention
    @Column({ type: 'timestamp', nullable: true })
    expiresAt?: Date | null; // When to delete the report

    @Column({ type: 'boolean', default: false })
    isArchived!: boolean;

    // PDF generation
    @Column({ type: 'boolean', default: false })
    pdfGenerated!: boolean;

    @Column({ type: 'timestamp', nullable: true })
    pdfGeneratedAt?: Date | null;

    @Column({ type: 'varchar', length: 255, nullable: true })
    pdfPath?: string | null; // If storing PDFs on filesystem/S3

    // Audit trail
    @UpdateDateColumn()
    updatedAt!: Date;

    @Column({ type: 'timestamp', nullable: true })
    viewedAt?: Date | null;

    @Column({ type: 'uuid', nullable: true })
    viewedBy?: string | null;

    @Column({ type: 'int', default: 0 })
    viewCount!: number;
}
