import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RolesService } from './roles.service';
import { RolesController } from './roles.controller';
import { RolePermission } from '@/entities/role-permission.entity';
import { Permission } from '@/entities/permissions.entity';
import { Role } from '@/entities/roles.entity';
import { PermissionsController } from '@/rbac/permissions.controller';
import { PermissionsService } from '@/rbac/permissions.service';

@Module({
    imports: [TypeOrmModule.forFeature([Role, Permission, RolePermission])],
    providers: [RolesService, PermissionsService],
    controllers: [RolesController, PermissionsController],
    exports: [RolesService, PermissionsService],
})
export class RolesModule {}
