import { Entity, Column, PrimaryGeneratedColumn, Unique, OneToMany } from 'typeorm';
import { RolePermission } from './role-permission.entity';

@Entity('roles')
@Unique(['slug'])
export class Role {
    @PrimaryGeneratedColumn('uuid') id!: string;

    // Keep slugs aligned with your enum values (e.g., 'sales_agent', 'admin_manager', etc.)
    @Column({ type: 'varchar', length: 64 }) slug!: string;

    @Column({ type: 'varchar', length: 128 }) name!: string;

    @Column({ type: 'varchar', length: 256, nullable: true }) description?: string;

    @OneToMany(() => RolePermission, (rp) => rp.role) permissions!: RolePermission[];
}
