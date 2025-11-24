/* eslint-disable @typescript-eslint/no-explicit-any */
import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Client as WWebClient, LocalAuth, Message } from 'whatsapp-web.js';
import {
    WhatsAppMessage,
    WhatsAppMessageStatus,
    WhatsAppMessageDirection,
} from '@/entities/whatsapp-message.entity';
import { WhatsAppSession, WhatsAppSessionStatus } from '@/entities/whatsapp-session.entity';
import { Client } from '@/entities/client.entity';
import * as fs from 'fs';
import * as path from 'path';

const SENDER_NUMBER = '+27726058688'; // The company WhatsApp number

@Injectable()
export class WhatsappService implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(WhatsappService.name);
    private client: WWebClient | null = null;
    private qrCode: string | null = null;
    private isReady = false;
    private readonly sessionPath: string;
    private session: WhatsAppSession | null = null;

    constructor(
        @InjectRepository(WhatsAppMessage)
        private messageRepo: Repository<WhatsAppMessage>,
        @InjectRepository(WhatsAppSession)
        private sessionRepo: Repository<WhatsAppSession>,
        @InjectRepository(Client)
        private clientRepo: Repository<Client>
    ) {
        // Store session data in apps/api/storage/whatsapp-session
        this.sessionPath = path.join(process.cwd(), 'storage', 'whatsapp-session');
        if (!fs.existsSync(this.sessionPath)) {
            fs.mkdirSync(this.sessionPath, { recursive: true });
        }
    }

    async onModuleInit() {
        this.logger.log('Initializing WhatsApp service...');
        await this.initializeSession();
        await this.initializeClient();
    }

    async onModuleDestroy() {
        this.logger.log('Destroying WhatsApp client...');
        if (this.client) {
            await this.client.destroy();
        }
    }

    private async initializeSession() {
        // Find or create the session record
        let session = await this.sessionRepo.findOne({
            where: { sessionName: 'default' },
        });

        if (!session) {
            session = this.sessionRepo.create({
                sessionName: 'default',
                status: WhatsAppSessionStatus.DISCONNECTED,
                phoneNumber: SENDER_NUMBER,
            });
            await this.sessionRepo.save(session);
        }

        this.session = session;
    }

    private async initializeClient() {
        try {
            this.client = new WWebClient({
                authStrategy: new LocalAuth({
                    clientId: 'default',
                    dataPath: this.sessionPath,
                }),
                puppeteer: {
                    headless: true,
                    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/chromium',
                    args: [
                        '--no-sandbox',
                        '--disable-setuid-sandbox',
                        '--disable-dev-shm-usage',
                        '--disable-accelerated-2d-canvas',
                        '--no-first-run',
                        '--no-zygote',
                        '--disable-gpu',
                    ],
                },
            });

            // QR code event
            this.client.on('qr', async (qr: string) => {
                this.logger.log('QR Code received, please scan it');
                this.qrCode = qr;
                if (this.session) {
                    this.session.qrCode = qr;
                    this.session.status = WhatsAppSessionStatus.QR_CODE;
                    await this.sessionRepo.save(this.session);
                }
            });

            // Ready event
            this.client.on('ready', async () => {
                this.logger.log('WhatsApp client is ready!');
                this.isReady = true;
                this.qrCode = null;
                if (this.session) {
                    this.session.status = WhatsAppSessionStatus.CONNECTED;
                    this.session.lastConnectedAt = new Date();
                    this.session.qrCode = undefined;
                    await this.sessionRepo.save(this.session);
                }
            });

            // Message received event
            this.client.on('message', async (msg: Message) => {
                await this.handleIncomingMessage(msg);
            });

            // Disconnected event
            this.client.on('disconnected', async (reason: string) => {
                this.logger.warn(`WhatsApp client disconnected: ${reason}`);
                this.isReady = false;
                if (this.session) {
                    this.session.status = WhatsAppSessionStatus.DISCONNECTED;
                    this.session.lastDisconnectedAt = new Date();
                    this.session.errorMessage = reason;
                    await this.sessionRepo.save(this.session);
                }
            });

            // Authentication failure event
            this.client.on('auth_failure', async (msg: string) => {
                this.logger.error(`Authentication failure: ${msg}`);
                if (this.session) {
                    this.session.status = WhatsAppSessionStatus.FAILED;
                    this.session.errorMessage = msg;
                    await this.sessionRepo.save(this.session);
                }
            });

            // Initialize the client
            await this.client.initialize();

            if (this.session) {
                this.session.status = WhatsAppSessionStatus.CONNECTING;
                await this.sessionRepo.save(this.session);
            }
        } catch (error: any) {
            this.logger.error('Failed to initialize WhatsApp client', error);
            if (this.session) {
                this.session.status = WhatsAppSessionStatus.FAILED;
                this.session.errorMessage = error?.message || 'Unknown error';
                await this.sessionRepo.save(this.session);
            }
        }
    }

    private async handleIncomingMessage(msg: Message) {
        try {
            // Get sender number
            const fromNumber = msg.from.replace('@c.us', '');

            // Find client by phone number
            const client = await this.clientRepo.findOne({
                where: { phoneNumber: fromNumber },
            });

            if (!client) {
                this.logger.warn(`Received message from unknown number: ${fromNumber}`);
                return;
            }

            // Save message to database
            const message = this.messageRepo.create({
                clientId: client.id,
                direction: WhatsAppMessageDirection.INBOUND,
                status: WhatsAppMessageStatus.DELIVERED,
                fromNumber: fromNumber,
                toNumber: SENDER_NUMBER,
                message: msg.body,
                whatsappMessageId: msg.id._serialized,
                sentAt: new Date(msg.timestamp * 1000),
                deliveredAt: new Date(),
                metadata: {
                    hasMedia: msg.hasMedia,
                    type: msg.type,
                },
            });

            await this.messageRepo.save(message);
            this.logger.log(`Saved incoming message from ${fromNumber}`);

            // Handle media if present
            if (msg.hasMedia) {
                try {
                    const media = await msg.downloadMedia();
                    if (media) {
                        // Save media file
                        const uploadsDir = path.join(process.cwd(), 'uploads', 'whatsapp');
                        if (!fs.existsSync(uploadsDir)) {
                            fs.mkdirSync(uploadsDir, { recursive: true });
                        }

                        const filename = `${Date.now()}_${msg.id._serialized}.${media.mimetype.split('/')[1]}`;
                        const filepath = path.join(uploadsDir, filename);

                        fs.writeFileSync(filepath, media.data, 'base64');

                        message.mediaUrl = `/uploads/whatsapp/${filename}`;
                        message.mediaMimeType = media.mimetype;
                        message.mediaFilename = filename;
                        await this.messageRepo.save(message);
                    }
                } catch (error: any) {
                    this.logger.error('Failed to download media', error);
                }
            }
        } catch (error: any) {
            this.logger.error('Failed to handle incoming message', error);
        }
    }

    async sendMessage(
        clientId: string,
        message: string,
        userId?: string
    ): Promise<WhatsAppMessage> {
        if (!this.isReady || !this.client) {
            throw new Error('WhatsApp client is not ready');
        }

        // Get client phone number
        const client = await this.clientRepo.findOne({ where: { id: clientId } });
        if (!client) {
            throw new Error('Client not found');
        }

        // Create message record
        const messageRecord = this.messageRepo.create({
            clientId,
            userId,
            direction: WhatsAppMessageDirection.OUTBOUND,
            status: WhatsAppMessageStatus.PENDING,
            fromNumber: SENDER_NUMBER,
            toNumber: client.phoneNumber,
            message,
        });

        await this.messageRepo.save(messageRecord);

        try {
            // Format number for WhatsApp
            const formattedNumber = client.phoneNumber.replace(/\D/g, '') + '@c.us';

            // Send message
            const sentMessage = await this.client.sendMessage(formattedNumber, message);

            // Update message record
            messageRecord.status = WhatsAppMessageStatus.SENT;
            messageRecord.sentAt = new Date();
            messageRecord.whatsappMessageId = sentMessage.id._serialized;
            await this.messageRepo.save(messageRecord);

            this.logger.log(`Message sent to ${client.phoneNumber}`);
            return messageRecord;
        } catch (error: any) {
            this.logger.error('Failed to send message', error);
            messageRecord.status = WhatsAppMessageStatus.FAILED;
            messageRecord.errorMessage = error?.message || 'Unknown error';
            await this.messageRepo.save(messageRecord);
            throw error;
        }
    }

    async getMessages(clientId: string, limit = 50): Promise<WhatsAppMessage[]> {
        return this.messageRepo.find({
            where: { clientId },
            order: { createdAt: 'DESC' },
            take: limit,
            relations: ['user'],
        });
    }

    async getQrCode(): Promise<string | null> {
        return this.qrCode;
    }

    async getSessionStatus(): Promise<WhatsAppSession | null> {
        return this.session;
    }

    isClientReady(): boolean {
        return this.isReady;
    }

    async resetSession(): Promise<void> {
        this.logger.log('Resetting WhatsApp session...');

        if (this.client) {
            await this.client.destroy();
        }

        // Delete session files
        if (fs.existsSync(this.sessionPath)) {
            fs.rmSync(this.sessionPath, { recursive: true, force: true });
        }

        // Update database
        if (this.session) {
            this.session.status = WhatsAppSessionStatus.DISCONNECTED;
            this.session.qrCode = undefined;
            this.session.lastDisconnectedAt = new Date();
            await this.sessionRepo.save(this.session);
        }

        // Reinitialize
        await this.initializeClient();
    }
}
