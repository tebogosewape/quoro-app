import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import nodemailer, { Transporter } from 'nodemailer';
import { ImapFlow } from 'imapflow';

type MessageAddress = { name?: string; address?: string };
type Envelope = { subject?: string; from?: MessageAddress[]; date?: Date };
type MessageWithEnvelope = { uid?: number; envelope?: Envelope };

@Injectable()
export class MailService {
    private transporter: Transporter;

    constructor(private readonly config: ConfigService) {
        const host = this.config.get<string>('SMTP_HOST');
        const port = Number(this.config.get<string>('SMTP_PORT') ?? 587);
        const secure = this.config.get<string>('SMTP_SECURE') === 'true';
        const user = this.config.get<string>('SMTP_USERNAME');
        const pass = this.config.get<string>('SMTP_PASSWORD');

        this.transporter = nodemailer.createTransport({
            host,
            port,
            secure,
            auth: { user, pass },
        });
    }

    async sendMail(payload: {
        to: string[];
        cc?: string[];
        bcc?: string[];
        subject: string;
        text?: string;
        html?: string;
    }) {
        try {
            const from = this.config.get<string>('SMTP_FROM');
            const info = await this.transporter.sendMail({
                from,
                to: payload.to,
                cc: payload.cc,
                bcc: payload.bcc,
                subject: payload.subject,
                text: payload.text,
                html: payload.html,
            });
            return { messageId: info.messageId, accepted: info.accepted, rejected: info.rejected };
        } catch (err) {
            throw new InternalServerErrorException({
                message: 'Failed to send email',
                error: String(err),
            });
        }
    }

    /**
     * List recent emails from the configured mailbox
     * @param limit how many messages to return (default 20)
     */
    async listEmails(limit = 20) {
        const client = new ImapFlow({
            host: this.config.get<string>('IMAP_HOST')!,
            port: Number(this.config.get<string>('IMAP_PORT') ?? 993),
            secure: this.config.get<string>('IMAP_SECURE') === 'true',
            auth: {
                user: this.config.get<string>('IMAP_USERNAME')!,
                pass: this.config.get<string>('IMAP_PASSWORD')!,
            },
        });

        try {
            await client.connect();
            const lock = await client.getMailboxLock(
                this.config.get<string>('IMAP_MAILBOX') ?? 'INBOX'
            );
            try {
                // Fetch newest first
                const seq = await client.search({ all: true });
                const uids = seq.slice(-limit); // last N
                const uidSeq = uids.join(','); // convert to IMAP sequence string
                const results: Array<{
                    uid: number;
                    subject: string | null;
                    from: string | null;
                    date: Date | null;
                }> = [];

                for await (const msg of client.fetch(uidSeq, { envelope: true })) {
                    const m = msg as MessageWithEnvelope;
                    const from =
                        m.envelope?.from
                            ?.map((a: MessageAddress) => a.address || a.name)
                            .join(', ') ?? null;
                    results.push({
                        uid: m.uid!,
                        subject: m.envelope?.subject ?? null,
                        from,
                        date: m.envelope?.date ?? null,
                    });
                }

                // newest first
                return results.sort((a, b) => (b.date?.getTime() ?? 0) - (a.date?.getTime() ?? 0));
            } finally {
                lock.release();
            }
        } catch (err) {
            throw new InternalServerErrorException({
                message: 'Failed to list emails',
                error: String(err),
            });
        } finally {
            try {
                await client.logout();
            } catch {
                // ignore logout errors
            }
        }
    }
}
