/* eslint-disable @typescript-eslint/no-explicit-any */
import { Body, Controller, Get, Post, Query, UseGuards, Request, Param } from '@nestjs/common';
import { ApiTags, ApiBody, ApiQuery, ApiOperation, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { WhatsappService } from './whatsapp.service';
import { SendMessageDto } from './dto/whatsapp.dto';
import { JwtAuthGuard } from '@/auth/jwt-auth.guard';
import { RolesGuard } from '@/auth/roles.guard';
import { Roles } from '@/auth/roles.decorator';
import { UserRole } from '@/entities/user.entity';

@ApiTags('whatsapp')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@SkipThrottle() // Skip rate limiting for WhatsApp endpoints (status polling)
@Controller('whatsapp')
export class WhatsappController {
    constructor(private readonly whatsappService: WhatsappService) {}

    // QR Code endpoint - only CEO can access
    @Get('qr-code')
    @Roles(UserRole.CHIEF_EXECUTIVE_OFFICER)
    @ApiOperation({ summary: 'Get QR code for WhatsApp authentication (CEO only)' })
    async getQrCode() {
        const qrCode = await this.whatsappService.getQrCode();
        return {
            success: true,
            data: {
                qrCode,
                message: qrCode
                    ? 'Scan this QR code with WhatsApp'
                    : 'Already connected or connecting',
            },
        };
    }

    // Session status - only CEO can access
    @Get('session/status')
    @Roles(UserRole.CHIEF_EXECUTIVE_OFFICER)
    @ApiOperation({ summary: 'Get WhatsApp session status (CEO only)' })
    async getSessionStatus() {
        const session = await this.whatsappService.getSessionStatus();
        return {
            success: true,
            data: {
                session,
                isReady: this.whatsappService.isClientReady(),
            },
        };
    }

    // Reset session - only CEO can access
    @Post('session/reset')
    @Roles(UserRole.CHIEF_EXECUTIVE_OFFICER)
    @ApiOperation({ summary: 'Reset WhatsApp session (CEO only)' })
    async resetSession() {
        await this.whatsappService.resetSession();
        return {
            success: true,
            message: 'Session reset initiated. Please scan the new QR code.',
        };
    }

    // Send message to client
    @Post('send')
    @ApiOperation({ summary: 'Send WhatsApp message to a client' })
    @ApiBody({ type: SendMessageDto })
    async sendMessage(@Body() dto: SendMessageDto, @Request() req: any) {
        const userId = req.user?.userId;
        const message = await this.whatsappService.sendMessage(dto.clientId, dto.message, userId);
        return {
            success: true,
            data: message,
        };
    }

    // Get messages for a client
    @Get('messages/:clientId')
    @ApiOperation({ summary: 'Get WhatsApp messages for a client' })
    @ApiParam({ name: 'clientId', description: 'Client ID' })
    @ApiQuery({ name: 'limit', required: false, description: 'Number of messages to retrieve' })
    async getMessages(@Param('clientId') clientId: string, @Query('limit') limit?: string) {
        const parsedLimit = limit ? parseInt(limit, 10) : 50;
        const messages = await this.whatsappService.getMessages(clientId, parsedLimit);
        return {
            success: true,
            data: messages,
        };
    }

    // Health check - accessible to all authenticated users
    @Get('health')
    @ApiOperation({ summary: 'Check if WhatsApp service is ready' })
    async health() {
        return {
            success: true,
            data: {
                isReady: this.whatsappService.isClientReady(),
                message: this.whatsappService.isClientReady()
                    ? 'WhatsApp service is ready'
                    : 'WhatsApp service is not ready',
            },
        };
    }
}
