/* eslint-disable @typescript-eslint/no-explicit-any */
import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

type InboundMsg = {
    ts: number;
    from: string;
    type: string;
    text?: string;
    raw: any;
};

@Injectable()
export class WhatsappService {
    private readonly token: string;
    private readonly phoneNumberId: string;
    private readonly version: string;

    private readonly defaultTemplate?: string;
    private readonly defaultLang: string;

    private inbox: InboundMsg[] = [];
    private readonly inboxCap = 200;

    constructor(private readonly config: ConfigService) {
        this.token = this.must('WHATSAPP_TOKEN');
        this.phoneNumberId = this.must('WHATSAPP_PHONE_NUMBER_ID');
        this.version = this.config.get<string>('WHATSAPP_API_VERSION') || 'v22.0';

        this.defaultTemplate = this.config.get<string>('WHATSAPP_DEFAULT_TEMPLATE');
        this.defaultLang = this.config.get<string>('WHATSAPP_DEFAULT_LANG') || 'en_US';
    }

    private must(key: string): string {
        const v = this.config.get<string>(key);
        if (!v) throw new Error(`Missing required env: ${key}`);
        return v;
    }

    private apiBase() {
        return `https://graph.facebook.com/${this.version}/${this.phoneNumberId}/messages`;
    }

    private sanitizeNumber(msisdn: string) {
        return (msisdn || '').replace(/[^\d]/g, '');
    }

    private isSessionError(graph: any): boolean {
        // Heuristic: common 24h window errors include code 470 or messages mentioning 24 hours/session
        const s = JSON.stringify(graph || '').toLowerCase();
        return (
            (s.includes('24') && s.includes('hour')) ||
            (s.includes('outside') && s.includes('session')) ||
            graph?.error?.code === 470
        );
    }

    async sendText(toRaw: string, body: string) {
        const to = this.sanitizeNumber(toRaw);
        if (!to)
            throw new BadRequestException({ message: 'Recipient must be digits only', to: toRaw });

        try {
            const res = await axios.post(
                this.apiBase(),
                {
                    messaging_product: 'whatsapp',
                    to,
                    type: 'text',
                    text: { preview_url: false, body },
                },
                {
                    headers: {
                        Authorization: `Bearer ${this.token}`,
                        'Content-Type': 'application/json',
                    },
                    timeout: 10000,
                }
            );
            return res.data;
        } catch (err: any) {
            // Bubble real Graph error so you can see why
            const status = err?.response?.status ?? 500;
            const graph = err?.response?.data;

            // If outside 24h (no active session) and a default template is configured, auto-fallback
            if (this.defaultTemplate && this.isSessionError(graph)) {
                try {
                    const fallback = await this.sendTemplate(
                        to,
                        this.defaultTemplate,
                        this.defaultLang
                    );
                    return {
                        note: 'Text failed outside 24h window; sent default template instead.',
                        fallback,
                    };
                } catch (fallbackErr: any) {
                    throw new InternalServerErrorException({
                        message: 'Text failed (no session) and template fallback also failed',
                        text_error: graph,
                        template_error: fallbackErr?.response?.data ?? String(fallbackErr),
                        to,
                        phoneNumberId: this.phoneNumberId,
                    });
                }
            }

            throw new InternalServerErrorException({
                message: 'Failed to send WhatsApp text',
                status,
                graph,
                to,
                phoneNumberId: this.phoneNumberId,
            });
        }
    }

    async sendTemplate(toRaw: string, name: string, languageCode = 'en_US', components?: any[]) {
        const to = this.sanitizeNumber(toRaw);
        if (!to)
            throw new BadRequestException({ message: 'Recipient must be digits only', to: toRaw });

        try {
            const res = await axios.post(
                this.apiBase(),
                {
                    messaging_product: 'whatsapp',
                    to,
                    type: 'template',
                    template: { name, language: { code: languageCode }, components },
                },
                {
                    headers: {
                        Authorization: `Bearer ${this.token}`,
                        'Content-Type': 'application/json',
                    },
                    timeout: 10000,
                }
            );
            return res.data;
        } catch (err: any) {
            const status = err?.response?.status ?? 500;
            const graph = err?.response?.data;
            throw new InternalServerErrorException({
                message: 'Failed to send WhatsApp template',
                status,
                graph,
                to,
                phoneNumberId: this.phoneNumberId,
            });
        }
    }

    // webhook helpers
    recordInbound(msg: InboundMsg) {
        this.inbox.push(msg);
        if (this.inbox.length > this.inboxCap) this.inbox.shift();
    }

    listInbox(limit = 20) {
        return this.inbox.slice(-limit).reverse();
    }
}
