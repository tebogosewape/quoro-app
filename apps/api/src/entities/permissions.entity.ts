import { Entity, Column, PrimaryGeneratedColumn, Unique, OneToMany } from 'typeorm';
import { RolePermission } from './role-permission.entity';

@Entity('permissions')
@Unique(['key'])
export class Permission {
    @PrimaryGeneratedColumn('uuid') id!: string;
    @Column({ type: 'varchar', length: 128 }) key!: string; // e.g. 'leads.upload'
    @Column({ type: 'varchar', length: 256, nullable: true }) description?: string;

    @OneToMany(() => RolePermission, (rp) => rp.permission) roles!: RolePermission[];
}
