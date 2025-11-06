import { Entity, ManyToOne, PrimaryGeneratedColumn, Unique, JoinColumn, Column } from 'typeorm';
import { Role } from './roles.entity';
import { Permission } from './permissions.entity';

@Entity('role_permissions')
@Unique(['roleId', 'permissionId'])
export class RolePermission {
    @PrimaryGeneratedColumn('uuid') id!: string;

    @Column({ type: 'uuid' }) roleId!: string;
    @Column({ type: 'uuid' }) permissionId!: string;

    @ManyToOne(() => Role, (r) => r.permissions, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'roleId' })
    role!: Role;

    @ManyToOne(() => Permission, (p) => p.roles, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'permissionId' })
    permission!: Permission;
}
