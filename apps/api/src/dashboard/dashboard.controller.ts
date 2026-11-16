import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthenticatedUser, CurrentUser, JwtAuthGuard, Roles, RolesGuard } from '@/auth';
import { AGENT_ROLES, EXECUTIVE_ROLES, MANAGER_ROLES } from '@/auth/role.utils';
import { DashboardFiltersDto } from './dashboard.dto';
import { DashboardService } from './dashboard.service';

@ApiTags('Dashboard')
@Controller('dashboard')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DashboardController {
    constructor(private readonly dashboardService: DashboardService) {}

    @Get('agent')
    @Roles(...AGENT_ROLES, ...MANAGER_ROLES, ...EXECUTIVE_ROLES)
    @ApiOperation({ summary: 'Get the dashboard data for an agent portfolio' })
    getAgentDashboard(
        @Query() filters: DashboardFiltersDto,
        @CurrentUser() user: AuthenticatedUser
    ) {
        return this.dashboardService.getAgentDashboard(filters, user);
    }
}
