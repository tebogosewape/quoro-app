import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/auth/jwt-auth.guard';
import { RolesGuard } from '@/auth/roles.guard';
import { PermissionsService } from './permissions.service';

@ApiTags('Permissions')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('permissions')
export class PermissionsController {
    constructor(private readonly perms: PermissionsService) {}

    @Get()
    @ApiOperation({ summary: 'List all permissions' })
    @ApiResponse({ status: 200, description: 'OK' })
    async list() {
        // Return a flat list; front-end expects { success, data }
        const data = await this.perms.findAll();
        return { success: true, data };
    }
}
