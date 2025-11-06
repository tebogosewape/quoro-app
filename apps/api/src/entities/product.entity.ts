/* eslint-disable indent */
import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from './base.entity';

export enum ProductCategory {
    VALUE_ADDED = 'value_added',
    DEBT_REVIEW = 'debt_review',
    LEGAL_SUPPORT = 'legal_support',
}

export enum ProductStatus {
    ACTIVE = 'active',
    INACTIVE = 'inactive',
    ARCHIVED = 'archived',
}

@Entity('products')
@Index(['code'], { unique: true })
@Index(['name'])
export class Product extends BaseEntity {
    @Column({ type: 'varchar', length: 100 })
    code!: string;

    @Column({ type: 'varchar', length: 200 })
    name!: string;

    @Column({ type: 'varchar', length: 50 })
    category!: ProductCategory;

    @Column({ type: 'varchar', length: 20, default: ProductStatus.ACTIVE })
    status!: ProductStatus;

    @Column({ type: 'tinyint', width: 1, default: 0 })
    requires_mandate!: boolean;

    @Column({ type: 'tinyint', width: 1, default: 0 })
    requires_credit_pull!: boolean;

    // JSON blobs stored as MySQL JSON (preferred) or text if your server lacks JSON support.
    @Column({ type: 'json', nullable: true })
    pricing_options?: unknown;

    @Column({ type: 'json', nullable: true })
    agent_commission_rules?: unknown;

    @Column({ type: 'json', nullable: true })
    capture_restrictions?: unknown;

    @Column({ type: 'text', nullable: true })
    description?: string;

    @Column({ type: 'json', nullable: true })
    fee_structure?: unknown;

    @Column({ type: 'json', nullable: true })
    status_flags?: unknown;
}
