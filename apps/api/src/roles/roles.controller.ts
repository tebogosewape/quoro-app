import { Controller, Get, Param, Put, Body, UseGuards } from '@nestjs/common';
import { RolesService } from './roles.service';
import { SetRolePermissionsDto } from './dto/set-role-permissions.dto';
import { JwtAuthGuard } from '@/auth/jwt-auth.guard';
import { PermissionsGuard } from '@/common/auth/permissions.guard';
import { Permissions } from '@/common/auth/permissions.decorator';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

@ApiTags('Roles')
@Controller('roles')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class RolesController {
    constructor(private readonly service: RolesService) {}

    @Get()
    @Permissions('roles.manage')
    list() {
        return this.service.list();
    }

    @Get(':slug/permissions')
    @Permissions('roles.manage')
    getPermissions(@Param('slug') slug: string) {
        return this.service.getPermissions(slug);
    }

    @Put(':slug/permissions')
    @Permissions('roles.manage')
    setPermissions(@Param('slug') slug: string, @Body() body: SetRolePermissionsDto) {
        return this.service.setPermissions(slug, body.permissions);
    }
}
