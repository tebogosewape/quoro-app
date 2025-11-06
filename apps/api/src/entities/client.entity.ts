/* eslint-disable indent */
import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from './base.entity';

export enum ClientStatus {
    LEAD = 'lead',
    CONSULTATION_SCHEDULED = 'consultation_scheduled',
    DOCUMENTATION_PENDING = 'documentation_pending',
    UNDER_REVIEW = 'under_review',
    APPROVED = 'approved',
    REJECTED = 'rejected',
    ACTIVE = 'active',
    COMPLETED = 'completed',
    WITHDRAWN = 'withdrawn',
}

export enum MaritalStatus {
    SINGLE = 'single',
    MARRIED = 'married',
    DIVORCED = 'divorced',
    WIDOWED = 'widowed',
}

export enum ClientType {
    INDIVIDUAL = 'individual',
    JOINT = 'joint',
    BUSINESS = 'business',
}

@Entity('clients')
@Index(['idNumber'], { unique: true })
@Index(['email'])
@Index(['phoneNumber'])
@Index(['status'])
export class Client extends BaseEntity {
    // Personal Information
    @Column({ type: 'varchar', length: 13, name: 'id_number', unique: true })
    idNumber!: string;

    @Column({ type: 'varchar', length: 100, name: 'first_name' })
    firstName!: string;

    @Column({ type: 'varchar', length: 100, name: 'last_name' })
    lastName!: string;

    @Column({ type: 'varchar', length: 255 })
    email!: string;

    @Column({ type: 'varchar', length: 20, name: 'phone_number' })
    phoneNumber!: string;

    @Column({ type: 'varchar', length: 20, name: 'alternate_phone', nullable: true })
    alternatePhone?: string;

    @Column({ type: 'date', name: 'date_of_birth' })
    dateOfBirth!: Date;

    // Status Information
    @Column({
        type: 'varchar',
        length: 30,
        default: ClientStatus.LEAD,
    })
    status!: ClientStatus;

    @Column({
        type: 'varchar',
        length: 20,
        name: 'marital_status',
    })
    maritalStatus!: MaritalStatus;

    @Column({
        type: 'varchar',
        length: 20,
        name: 'client_type',
        default: ClientType.INDIVIDUAL,
    })
    clientType!: ClientType;

    // Address Information
    @Column({ type: 'varchar', length: 500, name: 'physical_address' })
    physicalAddress!: string;

    @Column({ type: 'varchar', length: 500, name: 'postal_address', nullable: true })
    postalAddress?: string;

    // Financial Information
    @Column({ type: 'decimal', precision: 12, scale: 2, name: 'monthly_income' })
    monthlyIncome!: number;

    @Column({ type: 'decimal', precision: 12, scale: 2, name: 'monthly_expenses' })
    monthlyExpenses!: number;

    @Column({ type: 'decimal', precision: 15, scale: 2, name: 'total_debt' })
    totalDebt!: number;

    @Column({ type: 'int', name: 'credit_score', nullable: true })
    creditScore?: number;

    // Employment Information
    @Column({ type: 'varchar', length: 200, nullable: true })
    employer?: string;

    @Column({ type: 'varchar', length: 100, name: 'job_title', nullable: true })
    jobTitle?: string;

    // Banking Information
    @Column({ type: 'varchar', length: 100, name: 'bank_name', nullable: true })
    bankName?: string;

    @Column({ type: 'varchar', length: 50, name: 'account_type', nullable: true })
    accountType?: string;

    @Column({ type: 'varchar', length: 100, name: 'account_holder', nullable: true })
    accountHolder?: string;

    @Column({ type: 'varchar', length: 50, name: 'account_number', nullable: true })
    accountNumber?: string;

    @Column({ type: 'varchar', length: 20, name: 'branch_code', nullable: true })
    branchCode?: string;

    // Agent Assignment
    @Column({ type: 'varchar', length: 36, name: 'assigned_agent_id', nullable: true })
    assignedAgentId?: string;

    // Document Management
    @Column({ type: 'json', name: 'documents_required', nullable: true })
    documentsRequired?: string[];

    @Column({ type: 'json', name: 'documents_received', nullable: true })
    documentsReceived?: string[];

    // Product Information - stored as JSON for flexibility
    @Column({ type: 'json', name: 'selected_products', nullable: true })
    selectedProducts?: Array<{
        productId: string;
        paymentOptionId: string;
        cirAccounts?: string[];
    }>;

    // Payment Information
    @Column({ type: 'json', name: 'payment_info', nullable: true })
    paymentInfo?: {
        firstPaymentMonth?: string;
        selectedPaymentOptions?: Record<string, string>;
    };

    // Additional Information
    @Column({ type: 'varchar', length: 50, nullable: true })
    title?: string;

    @Column({ type: 'varchar', length: 50, nullable: true })
    language?: string;

    @Column({ type: 'varchar', length: 10, nullable: true })
    gender?: string;

    // Notes and Communication
    @Column({ type: 'text', nullable: true })
    notes?: string;
}
