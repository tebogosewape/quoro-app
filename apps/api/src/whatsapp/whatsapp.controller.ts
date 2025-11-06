/* eslint-disable @typescript-eslint/no-explicit-any */
import { Body, Controller, Get, Post, Query, Req, Res } from '@nestjs/common';
import { ApiTags, ApiBody, ApiQuery, ApiOperation } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { Request, Response } from 'express';
import { WhatsappService } from './whatsapp.service';
import { SendTextDto } from './dto/send-text.dto';
import { SendTemplateDto } from './dto/send-template.dto';

@ApiTags('whatsapp')
@Controller('whatsapp')
export class WhatsappController {
    constructor(
        private readonly svc: WhatsappService,
        private readonly config: ConfigService
    ) {}

    // --- Sending -------------------------------------------------------------

    @Post('send/text')
    @ApiOperation({ summary: 'Send a WhatsApp text message' })
    @ApiBody({ type: SendTextDto })
    async sendText(@Body() dto: SendTextDto) {
        const to = dto.to.replace(/^"+/, '');
        return this.svc.sendText(to, dto.message);
    }

    @Post('send/template')
    @ApiOperation({ summary: 'Send a WhatsApp template message' })
    @ApiBody({ type: SendTemplateDto })
    async sendTemplate(@Body() dto: SendTemplateDto) {
        const to = dto.to.replace(/^"+/, '');
        return this.svc.sendTemplate(to, dto.name, dto.languageCode, dto.components);
    }

    // --- Webhook: verification (GET) ----------------------------------------

    @Get('webhook')
    @ApiOperation({ summary: 'Webhook verification (Meta/Facebook)' })
    @ApiQuery({ name: 'hub.mode', required: true, description: 'Mode (should be "subscribe")' })
    @ApiQuery({ name: 'hub.verify_token', required: true, description: 'Verification token' })
    @ApiQuery({ name: 'hub.challenge', required: true, description: 'Challenge string' })
    verify(
        @Query('hub.mode') mode: string,
        @Query('hub.verify_token') verifyToken: string,
        @Query('hub.challenge') challenge: string,
        @Res() res: Response
    ) {
        const token = this.config.get<string>('WHATSAPP_VERIFY_TOKEN');
        if (mode === 'subscribe' && verifyToken === token) {
            return res.status(200).send(challenge);
        }
        return res.sendStatus(403);
    }

    // --- Webhook: receiver (POST) -------------------------------------------

    @Post('webhook')
    @ApiOperation({ summary: 'Webhook receiver (Meta/Facebook)' })
    receive(@Req() req: Request, @Res() res: Response) {
        // Meta requires a fast 200 OK
        res.sendStatus(200);

        const body = req.body as any;
        try {
            const entries = body?.entry ?? [];
            for (const entry of entries) {
                const changes = entry?.changes ?? [];
                for (const change of changes) {
                    const value = change?.value;
                    const msg = value?.messages?.[0];
                    if (!msg) continue;

                    const from = msg.from; // e.g. "2772..."
                    const type = msg.type; // "text", "image", ...
                    const text = msg.text?.body;

                    this.svc.recordInbound({
                        ts: Date.now(),
                        from,
                        type,
                        text,
                        raw: msg,
                    });

                    // You could auto-reply here if you want:
                    // if (type === 'text') this.svc.sendText(from, `Got: ${text}`);
                }
            }
        } catch {
            // ignore — never throw from webhook
        }
    }

    // --- Demo inbox (pull what we've received & stored) ---------------------

    @Get('inbox')
    @ApiOperation({ summary: 'List received WhatsApp messages (demo inbox)' })
    @ApiQuery({
        name: 'limit',
        required: false,
        description: 'Number of messages to return (default 20, max 200)',
    })
    inbox(@Query('limit') limit?: string) {
        const n = Math.max(1, Math.min(200, Number(limit) || 20));
        return this.svc.listInbox(n);
    }
}
