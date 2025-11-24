/* eslint-disable indent */
import {
    Column,
    CreateDateColumn,
    Entity,
    Index,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'leads' })
@Index('uniq_lead_business_key', ['timeReceived', 'cell', 'affiliate'], { unique: true })
export class Lead {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ type: 'datetime' })
    timeReceived!: Date; // "Time Received"

    @Column({ type: 'varchar', length: 100, nullable: true })
    franchise!: string | null; // "Franchise"

    @Column({ type: 'varchar', length: 150, nullable: true })
    name!: string | null; // "Name"

    @Column({ type: 'varchar', length: 32 })
    cell!: string; // "Cell" (digits only)

    @Column({ type: 'varchar', length: 32, nullable: true })
    idNumber!: string | null; // "ID Number"

    @Column({ type: 'varchar', length: 100, nullable: true })
    affiliate!: string | null; // "Affiliate"

    @Column({ type: 'text', nullable: true })
    message!: string | null; // "Message"

    @Column({ type: 'varchar', length: 120, nullable: true })
    allocatedTo!: string | null; // "Allocated to"

    @Column({ type: 'varchar', length: 120, nullable: true })
    leadOutcome!: string | null; // "Lead Outcome"

    @Column({ type: 'uuid', nullable: true })
    clientId!: string | null; // Reference to client if lead was converted

    @CreateDateColumn()
    createdAt!: Date;

    @UpdateDateColumn()
    updatedAt!: Date;
}
