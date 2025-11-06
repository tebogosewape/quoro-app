import { Controller, Get, Put, Body, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CommissionService } from './commission.service';
import { CommissionResponseDto, UpdateCommissionDto } from './commission.dto';
import { JwtAuthGuard, Roles, RolesGuard } from '@/auth';
import { UserRole } from '@/entities';

@ApiTags('Commission')
@ApiBearerAuth('JWT-auth')
@Controller('commission')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CommissionController {
    constructor(private readonly svc: CommissionService) {}

    @Get()
    @Roles(UserRole.MANAGER) // Managers can view
    @ApiOperation({ summary: 'Get global commission (Managers only)' })
    @ApiResponse({
        status: 200,
        description: 'Current global commission percentage',
        type: CommissionResponseDto,
    })
    async getCommission(): Promise<CommissionResponseDto> {
        const percentage = await this.svc.getGlobal();
        return { percentage };
    }

    @Put()
    @Roles(UserRole.MANAGER) // Managers can update
    @ApiOperation({ summary: 'Update global commission (Managers only)' })
    @ApiResponse({
        status: 200,
        description: 'Updated global commission percentage',
        type: CommissionResponseDto,
    })
    async updateCommission(@Body() dto: UpdateCommissionDto): Promise<CommissionResponseDto> {
        const percentage = await this.svc.updateGlobal(dto.percentage);
        return { percentage };
    }
}
