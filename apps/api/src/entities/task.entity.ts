/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable indent */
import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    ManyToOne,
    JoinColumn,
} from 'typeorm';
import { User } from './user.entity';
import { Client } from './client.entity';

export type TaskStatus =
    | 'pending'
    | 'assigned'
    | 'in_progress'
    | 'completed'
    | 'cancelled'
    | 'overdue'
    | 'on_hold';
export type TaskPriority = 'low' | 'normal' | 'high' | 'urgent';
export type TaskType =
    | 'consultation'
    | 'document_collection'
    | 'verification'
    | 'credit_check'
    | 'follow_up'
    | 'review'
    | 'approval'
    | 'communication'
    | 'internal'
    | 'other';

@Entity('tasks')
export class Task {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ type: 'varchar', length: 255 })
    title!: string;

    @Column({ type: 'text', nullable: true })
    description?: string;

    @Column({ type: 'varchar', length: 50 })
    type!: TaskType;

    @Column({ type: 'varchar', length: 50, default: 'pending' })
    status!: TaskStatus;

    @Column({ type: 'varchar', length: 50, default: 'normal' })
    priority!: TaskPriority;

    @Column({ type: 'datetime', nullable: true })
    dueDate?: Date;

    @Column({ type: 'datetime', nullable: true })
    completedAt?: Date;

    @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
    estimatedHours?: number;

    @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
    actualHours?: number;

    @Column({ type: 'text', nullable: true })
    completionNotes?: string;

    @Column({ type: 'json', nullable: true })
    metadata?: Record<string, any>;

    @Column({ type: 'uuid', nullable: true })
    assignedToUserId?: string;

    @ManyToOne(() => User, { nullable: true, createForeignKeyConstraints: false })
    @JoinColumn({ name: 'assignedToUserId' })
    assignedToUser?: User;

    @Column({ type: 'uuid', nullable: true })
    clientId?: string;

    @ManyToOne(() => Client, { nullable: true })
    @JoinColumn({ name: 'clientId' })
    client?: Client;

    @Column({ type: 'uuid', nullable: true })
    createdByUserId?: string;

    // Disable automatic FK creation here because some environments contain legacy task rows
    // whose `createdByUserId` may not match a `users.id`. Creating the FK during startup
    // causes the DB migration to fail. We still keep the relation for convenience in code,
    // but instruct TypeORM not to emit the foreign key constraint.
    @ManyToOne(() => User, { nullable: true, createForeignKeyConstraints: false })
    @JoinColumn({ name: 'createdByUserId' })
    createdByUser?: User;

    @CreateDateColumn()
    createdAt!: Date;

    @UpdateDateColumn()
    updatedAt!: Date;
}
