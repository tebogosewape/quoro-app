import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuditService } from './audit.service';
import { AuthenticatedUser, CurrentUser, JwtAuthGuard } from '@/auth';

class LogOnboardingStepDto {
    step!: string;
    clientId?: string;
    metadata?: Record<string, unknown>;
}

@ApiTags('Audit')
@Controller('audit')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
export class AuditController {
    constructor(private readonly auditService: AuditService) {}

    /**
     * Log onboarding step completion
     */
    @Post('onboarding-step')
    @ApiOperation({
        summary: 'Log onboarding step completion',
        description: 'Records when an agent completes a step in the client onboarding wizard',
    })
    @ApiResponse({
        status: 200,
        description: 'Onboarding step logged successfully',
    })
    async logOnboardingStep(
        @Body() dto: LogOnboardingStepDto,
        @CurrentUser() user: AuthenticatedUser
    ) {
        await this.auditService.logOnboardingStep({
            clientId: dto.clientId,
            step: dto.step,
            agentId: user.id,
            metadata: {
                agentEmail: user.email,
                ...(dto.metadata ?? {}),
            },
        });

        return { success: true, message: 'Onboarding step logged' };
    }
}
