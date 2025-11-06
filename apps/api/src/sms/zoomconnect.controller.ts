import { Body, Controller, Get, Headers, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { ZoomConnectService } from './zoomconnect.service';
import { SendZoomSmsDto, SendZoomSmsResponseDto } from './dto/send-zoom-sms.dto';
import { ZoomStatsQueryDto } from './dto/zoom-stats.dto';
import { CurrentUser } from '@/auth/current-user.decorator';
import { AuthenticatedUser } from '@/auth';

@ApiTags('ZoomConnect')
@ApiBearerAuth()
@Controller('zoomconnect')
export class ZoomConnectController {
    constructor(private readonly svc: ZoomConnectService) {}

    @Post('sms/send')
    @ApiBody({ type: SendZoomSmsDto })
    @ApiOkResponse({ type: SendZoomSmsResponseDto })
    async sendSms(
        @Body() dto: SendZoomSmsDto,
        @CurrentUser() currentUser: AuthenticatedUser
    ): Promise<SendZoomSmsResponseDto> {
        return this.svc.send(dto, currentUser);
    }

    @Get('stats')
    @ApiOkResponse({
        schema: {
            example: {
                from: 1762034400000,
                to: 1762120799999,
                showingCreditValue: false,
                grandTotal: {
                    delivered: 1,
                    sent: 0,
                    failed: 0,
                    failedRefunded: 0,
                    failedOptout: 0,
                    total: 1,
                },
                users: [
                    {
                        user: {
                            userId: 18987,
                            firstName: 'Xolisile',
                            lastName: 'Radebe',
                            emailAddress: 'xoli@quorafinance.co.za',
                            company: 'Quora Holdings Pty Ltd',
                            contactNumber: '27817933632',
                            password: null,
                            creditBalance: 5959,
                        },
                        total: {
                            delivered: 1,
                            sent: 0,
                            failed: 0,
                            failedRefunded: 0,
                            failedOptout: 0,
                            total: 1,
                        },
                        campaigns: [
                            {
                                campaign: '',
                                statistics: {
                                    delivered: 1,
                                    sent: 0,
                                    failed: 0,
                                    failedRefunded: 0,
                                    failedOptout: 0,
                                    total: 1,
                                },
                            },
                        ],
                    },
                ],
            },
        },
        description: 'Proxy of ZoomConnect account statistics.',
    })
    async stats(@Query() q: ZoomStatsQueryDto) {
        return this.svc.stats(q);
    }
}

@ApiTags('ZoomConnect Webhook')
@Controller('zoomconnect/webhook')
export class ZoomConnectWebhookController {
    constructor(private readonly svc: ZoomConnectService) {}

    @Post()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async receive(@Body() body: any, @Headers('x-zoomconnect-signature') sig?: string) {
        if (!this.svc.verifyWebhookSecret(sig)) {
            // Deliberately generic; avoids leaking details
            return { ok: false };
        }
        return this.svc.handleWebhook(body);
    }
}
