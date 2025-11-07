import {
    Controller,
    Get,
    Post,
    Put,
    Delete,
    Body,
    Param,
    Query,
    ParseUUIDPipe,
    UseGuards,
    HttpCode,
    HttpStatus,
    Res,
} from '@nestjs/common';
import { Response } from 'express';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ClientsService } from './clients.service';
import { ExperianReportService } from './experian-report.service';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { SearchClientsDto } from './dto/search-clients.dto';
import { AuthenticatedUser, CurrentUser, JwtAuthGuard, Roles, RolesGuard } from '@/auth';
import { UserRole } from '@/entities/user.entity';

@ApiTags('Clients')
@Controller('clients')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ClientsController {
    constructor(
        private readonly clientsService: ClientsService,
        private readonly experianReportService: ExperianReportService
    ) {}

    /**
     * Create a new client (onboarding endpoint)
     * Accessible to all authenticated users
     * If created by an agent, the client is automatically assigned to them
     */
    @Post('onboard')
    @ApiOperation({ summary: 'Create a new client via onboarding wizard' })
    @HttpCode(HttpStatus.CREATED)
    async onboard(
        @Body() createClientDto: CreateClientDto,
        @CurrentUser() user: AuthenticatedUser
    ) {
        console.log(
            '[ClientsController] Received createClientDto:',
            JSON.stringify(createClientDto, null, 2)
        );
        console.log(
            '[ClientsController] selectedProducts type:',
            typeof createClientDto.selectedProducts
        );
        console.log('[ClientsController] selectedProducts:', createClientDto.selectedProducts);
        if (createClientDto.selectedProducts && createClientDto.selectedProducts.length > 0) {
            console.log('[ClientsController] First product:', createClientDto.selectedProducts[0]);
            console.log(
                '[ClientsController] First product type:',
                typeof createClientDto.selectedProducts[0]
            );
        }

        const client = await this.clientsService.create(createClientDto, user.id, user.role);
        return {
            success: true,
            data: client,
            meta: { timestamp: new Date().toISOString() },
        };
    }

    /**
     * Get all clients with pagination and filtering
     * Managers/Admins see all clients
     * Agents only see clients assigned to them
     */
    @Get()
    @Roles(
        UserRole.ADMIN,
        UserRole.MANAGER,
        UserRole.TEAM_LEADER,
        UserRole.OPERATIONS_MANAGER,
        UserRole.CHIEF_EXECUTIVE_OFFICER,
        UserRole.AGENT,
        UserRole.VIEWER
    )
    @ApiOperation({ summary: 'Get all clients with pagination and filtering' })
    async findAll(@Query() searchDto: SearchClientsDto, @CurrentUser() user: AuthenticatedUser) {
        // If user is an agent, automatically filter to only their assigned clients
        const effectiveSearchDto = { ...searchDto };
        if (user.role === UserRole.AGENT) {
            effectiveSearchDto.assignedAgentId = user.id;
        }

        const result = await this.clientsService.findAll(effectiveSearchDto);
        return {
            success: true,
            data: result.data,
            meta: {
                ...result.meta,
                timestamp: new Date().toISOString(),
            },
        };
    }

    /**
     * Get client statistics
     */
    @Get('stats')
    @Roles(
        UserRole.ADMIN,
        UserRole.MANAGER,
        UserRole.OPERATIONS_MANAGER,
        UserRole.CHIEF_EXECUTIVE_OFFICER
    )
    @ApiOperation({ summary: 'Get client statistics' })
    async getStats() {
        const stats = await this.clientsService.getStats();
        return {
            success: true,
            data: stats,
            meta: { timestamp: new Date().toISOString() },
        };
    }

    /**
     * Get a single client by ID
     */
    @Get(':id')
    @Roles(
        UserRole.ADMIN,
        UserRole.MANAGER,
        UserRole.TEAM_LEADER,
        UserRole.AGENT,
        UserRole.OPERATIONS_MANAGER,
        UserRole.CHIEF_EXECUTIVE_OFFICER,
        UserRole.VIEWER
    )
    @ApiOperation({ summary: 'Get a client by ID' })
    async findOne(@Param('id', ParseUUIDPipe) id: string) {
        const client = await this.clientsService.findOne(id);
        return {
            success: true,
            data: client,
            meta: { timestamp: new Date().toISOString() },
        };
    }

    /**
     * Get communication history for a client
     */
    @Get(':id/communications')
    @Roles(
        UserRole.ADMIN,
        UserRole.MANAGER,
        UserRole.TEAM_LEADER,
        UserRole.AGENT,
        UserRole.OPERATIONS_MANAGER,
        UserRole.CHIEF_EXECUTIVE_OFFICER,
        UserRole.VIEWER
    )
    @ApiOperation({ summary: 'Get communication history for a client' })
    async getClientCommunications(@Param('id', ParseUUIDPipe) id: string) {
        const communications = await this.clientsService.getClientCommunications(id);
        return {
            success: true,
            data: communications,
            meta: { timestamp: new Date().toISOString() },
        };
    }

    /**
     * Send email to a client
     */
    @Post(':id/send-email')
    @Roles(
        UserRole.ADMIN,
        UserRole.MANAGER,
        UserRole.TEAM_LEADER,
        UserRole.AGENT,
        UserRole.OPERATIONS_MANAGER
    )
    @ApiOperation({ summary: 'Send email to a client' })
    async sendEmail(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() emailData: { subject: string; message: string },
        @CurrentUser() user: AuthenticatedUser
    ) {
        const result = await this.clientsService.sendEmailToClient(
            id,
            emailData.subject,
            emailData.message,
            user.id
        );
        return {
            success: true,
            data: result,
            meta: { timestamp: new Date().toISOString() },
        };
    }

    /**
     * Send SMS to a client
     */
    @Post(':id/send-sms')
    @Roles(
        UserRole.ADMIN,
        UserRole.MANAGER,
        UserRole.TEAM_LEADER,
        UserRole.AGENT,
        UserRole.OPERATIONS_MANAGER
    )
    @ApiOperation({ summary: 'Send SMS to a client' })
    async sendSms(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() smsData: { message: string },
        @CurrentUser() user: AuthenticatedUser
    ) {
        const result = await this.clientsService.sendSmsToClient(id, smsData.message, user.id);
        return {
            success: true,
            data: result,
            meta: { timestamp: new Date().toISOString() },
        };
    }

    /**
     * Update a client
     */
    @Put(':id')
    @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.TEAM_LEADER, UserRole.AGENT)
    @ApiOperation({ summary: 'Update a client' })
    async update(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() updateClientDto: UpdateClientDto,
        @CurrentUser() user: AuthenticatedUser
    ) {
        const client = await this.clientsService.update(id, updateClientDto, user.id);
        return {
            success: true,
            data: client,
            meta: { timestamp: new Date().toISOString() },
        };
    }

    /**
     * Delete a client (soft delete)
     */
    @Delete(':id')
    @Roles(UserRole.ADMIN, UserRole.MANAGER)
    @ApiOperation({ summary: 'Delete a client (soft delete)' })
    @HttpCode(HttpStatus.NO_CONTENT)
    async remove(@Param('id', ParseUUIDPipe) id: string) {
        await this.clientsService.remove(id);
    }

    /**
     * Generate mock Experian credit report PDF
     */
    @Get(':id/credit-report')
    @Roles(
        UserRole.ADMIN,
        UserRole.MANAGER,
        UserRole.TEAM_LEADER,
        UserRole.AGENT,
        UserRole.OPERATIONS_MANAGER,
        UserRole.CHIEF_EXECUTIVE_OFFICER
    )
    @ApiOperation({ summary: 'Generate mock Experian credit report PDF' })
    async getCreditReport(@Param('id', ParseUUIDPipe) id: string, @Res() res: Response) {
        const client = await this.clientsService.findOne(id);
        const pdfBuffer = await this.experianReportService.generateCreditReport(client);

        res.set({
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="experian-report-${client.idNumber}.pdf"`,
            'Content-Length': pdfBuffer.length,
        });

        res.send(pdfBuffer);
    }
}
