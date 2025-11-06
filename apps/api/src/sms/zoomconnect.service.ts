/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable indent */
import { BadRequestException, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DeepPartial } from 'typeorm';
import { SmsMessage, SmsDirection, SmsStatus } from '@/entities/sms-message.entity';
import { SendZoomSmsDto, SendZoomSmsResponseDto } from './dto/send-zoom-sms.dto';
import { AuthenticatedUser } from '@/auth';

@Injectable()
export class ZoomConnectService {
    private readonly logger = new Logger(ZoomConnectService.name);
    private readonly baseURL: string;
    private readonly email: string;
    private readonly token: string;
    private readonly webhookSecret?: string;

    constructor(
        private readonly config: ConfigService,
        @InjectRepository(SmsMessage) private repo: Repository<SmsMessage>
    ) {
        this.baseURL = this.config.get<string>(
            'ZOOMCONNECT_BASE_URL',
            'https://www.zoomconnect.com:443/app/api/rest/v1/'
        )!;
        this.email = this.config.get<string>('ZOOMCONNECT_EMAIL', '')!;
        this.token = this.config.get<string>('ZOOMCONNECT_TOKEN', '')!;
        this.webhookSecret = this.config.get<string>('ZOOMCONNECT_WEBHOOK_SECRET') || undefined;
    }

    private join(path: string) {
        return `${this.baseURL.replace(/\/+$/, '')}/${path.replace(/^\/+/, '')}`;
    }

    private normalizeMsisdn(n?: string): string | undefined {
        if (!n) return n;
        const digits = n.replace(/\D/g, '');
        if (digits.startsWith('0')) return '27' + digits.slice(1);
        return digits;
    }

    private isoToUtcRangeMillis(fromIso: string, toIso: string) {
        const start = new Date(fromIso);
        const end = new Date(toIso);

        // normalize to start/end of their respective UTC days
        const startUtc = Date.UTC(
            start.getUTCFullYear(),
            start.getUTCMonth(),
            start.getUTCDate(),
            0,
            0,
            0,
            0
        );
        const endUtc = Date.UTC(
            end.getUTCFullYear(),
            end.getUTCMonth(),
            end.getUTCDate(),
            23,
            59,
            59,
            999
        );

        if (isNaN(startUtc) || isNaN(endUtc)) {
            throw new BadRequestException('Invalid ISO date(s) for from/to');
        }
        if (endUtc < startUtc) {
            throw new BadRequestException('`to` must be on or after `from`');
        }
        return { fromMs: startUtc, toMs: endUtc };
    }

    async send(dto: SendZoomSmsDto, user: AuthenticatedUser): Promise<SendZoomSmsResponseDto> {
        if (!this.email || !this.token) {
            throw new UnauthorizedException('ZoomConnect credentials not configured');
        }

        const to = this.normalizeMsisdn(dto.recipientNumber ?? user?.phoneNumber);
        if (!to) {
            throw new Error('Recipient number is required (no user phone available).');
        }

        // Persist queued message first (use undefined for optional fields)
        const pre: DeepPartial<SmsMessage> = {
            direction: SmsDirection.OUTBOUND,
            zoomMessageId: undefined,
            repliedToMessageId: undefined,
            to,
            from: undefined, // provider doesn’t use this – leave undefined
            message: dto.message,
            status: SmsStatus.QUEUED,
            campaign: dto.campaign ?? undefined,
            dataField: dto.dataField ?? undefined,
            sentAt: undefined,
            deliveredAt: undefined,
            providerPayload: undefined,
            createdBy: user?.id,
            updatedBy: user?.id,
        };
        const record = this.repo.create(pre);
        await this.repo.save(record);

        // Provider call
        const url = this.join('sms/send');
        const params = { email: this.email, token: this.token };
        const payload = {
            message: dto.message,
            campaign: dto.campaign ?? '',
            dateToSend: dto.dateToSend,
            dataField: dto.dataField,
            recipientNumber: to,
        };

        try {
            const { data } = await axios.post<SendZoomSmsResponseDto>(url, payload, { params });

            // In case the API ever returns an array (paranoid), normalize:
            const messageObj: SendZoomSmsResponseDto = Array.isArray(data) ? data[0] : data;

            record.zoomMessageId = messageObj?.messageId ?? undefined;
            record.status = messageObj?.error ? SmsStatus.FAILED : SmsStatus.SENT;
            record.sentAt = new Date();
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            record.providerPayload = messageObj as any;
            await this.repo.save(record);

            return messageObj;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (err: any) {
            this.logger.error('ZoomConnect send failed', err?.response?.data ?? err);
            record.status = SmsStatus.FAILED;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            record.providerPayload = (err?.response?.data ?? { message: String(err) }) as any;
            await this.repo.save(record);
            throw err;
        }
    }

    async stats(q: { from?: string; to?: string }) {
        if (!this.email || !this.token) {
            throw new UnauthorizedException('ZoomConnect credentials not configured');
        }

        const url = this.join('account/statistics');
        const baseParams: Record<string, string | number> = {
            email: this.email,
            token: this.token,
        };

        // build params with optional epoch millis range
        const params: Record<string, string | number> = { ...baseParams };

        // Only apply range if BOTH from and to are present
        // if (q.from && q.to) {
        //     const { fromMs, toMs } = this.isoToUtcRangeMillis(q.from, q.to);
        //     params = { ...params, from: fromMs, to: toMs };
        // }

        console.log('ZoomConnect stats url', url);
        console.log('ZoomConnect stats params', params);

        const { data } = await axios.get(url, { params });
        console.log('ZoomConnect stats data', data);

        return data;
    }

    verifyWebhookSecret(headerValue?: string) {
        if (!this.webhookSecret) return true;
        return headerValue === this.webhookSecret;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async handleWebhook(body: any) {
        const zoomMessageId: string | undefined =
            body?.messageId || body?.messageID || body?.id || body?.payload?.messageId;

        if (!zoomMessageId) {
            this.logger.warn('Webhook payload without messageId', body);
            return { ok: true };
        }

        const msg = await this.repo.findOne({ where: { zoomMessageId } });
        if (!msg) {
            this.logger.warn(`Webhook for unknown zoomMessageId=${zoomMessageId}`);
            return { ok: true };
        }

        const statusRaw: string | undefined =
            body?.status || body?.deliveryStatus || body?.payload?.status;

        if (statusRaw) {
            const s = String(statusRaw).toLowerCase();
            if (s.includes('deliver')) {
                msg.status = SmsStatus.DELIVERED;
                msg.deliveredAt = new Date();
            } else if (s.includes('fail') || s.includes('error')) {
                msg.status = SmsStatus.FAILED;
            }
        }

        // keep entire webhook payload for traceability
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        msg.providerPayload = { ...(msg.providerPayload ?? {}), webhook: body as any };
        await this.repo.save(msg);
        return { ok: true };
    }
}
