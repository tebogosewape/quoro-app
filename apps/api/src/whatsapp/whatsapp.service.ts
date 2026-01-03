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

    private cleanupLockFiles() {
        try {
            this.logger.log(`🧹 [CLEANUP] Checking for lock files in: ${this.sessionPath}`);

            // Clean up Chrome singleton lock files
            const singletonLockPath = path.join(this.sessionPath, 'SingletonLock');
            const singletonSocketPath = path.join(this.sessionPath, 'SingletonSocket');
            const singletonCookiePath = path.join(this.sessionPath, 'SingletonCookie');

            this.logger.log(
                `🔍 [CLEANUP] Checking SingletonLock: ${fs.existsSync(singletonLockPath)}`
            );
            this.logger.log(
                `🔍 [CLEANUP] Checking SingletonSocket: ${fs.existsSync(singletonSocketPath)}`
            );
            this.logger.log(
                `🔍 [CLEANUP] Checking SingletonCookie: ${fs.existsSync(singletonCookiePath)}`
            );

            if (fs.existsSync(singletonLockPath)) {
                fs.unlinkSync(singletonLockPath);
                this.logger.log('✅ [CLEANUP] Removed stale SingletonLock file');
            }
            if (fs.existsSync(singletonSocketPath)) {
                fs.unlinkSync(singletonSocketPath);
                this.logger.log('✅ [CLEANUP] Removed stale SingletonSocket file');
            }
            if (fs.existsSync(singletonCookiePath)) {
                fs.unlinkSync(singletonCookiePath);
                this.logger.log('✅ [CLEANUP] Removed stale SingletonCookie file');
            }

            // Also clean up in the Default profile directory if it exists
            const defaultProfilePath = path.join(this.sessionPath, 'Default');
            if (fs.existsSync(defaultProfilePath)) {
                const defaultLockPath = path.join(defaultProfilePath, 'SingletonLock');
                const defaultSocketPath = path.join(defaultProfilePath, 'SingletonSocket');
                const defaultCookiePath = path.join(defaultProfilePath, 'SingletonCookie');

                if (fs.existsSync(defaultLockPath)) {
                    fs.unlinkSync(defaultLockPath);
                    this.logger.log('Removed stale Default/SingletonLock file');
                }
                if (fs.existsSync(defaultSocketPath)) {
                    fs.unlinkSync(defaultSocketPath);
                    this.logger.log('Removed stale Default/SingletonSocket file');
                }
                if (fs.existsSync(defaultCookiePath)) {
                    fs.unlinkSync(defaultCookiePath);
                    this.logger.log('Removed stale Default/SingletonCookie file');
                }
            }
        } catch (error: any) {
            this.logger.warn(`Failed to cleanup lock files: ${error?.message}`);
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
            this.logger.log('🚀 [INIT] Starting WhatsApp client initialization...');

            // Clean up any stale lock files before initializing
            this.cleanupLockFiles();

            // Destroy existing client if any
            if (this.client) {
                this.logger.log('🧹 [INIT] Destroying existing client...');
                try {
                    await this.client.destroy();
                    this.client = null;
                } catch (error) {
                    this.logger.warn('Error destroying existing client:', error);
                }
            }

            // Wait a bit for Chrome to fully release resources
            this.logger.log('⏳ [INIT] Waiting for Chrome to release resources...');
            await new Promise((resolve) => setTimeout(resolve, 1000));

            this.logger.log('📱 [INIT] Creating WhatsApp Web client...');
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
                        '--disable-extensions',
                        '--disable-software-rasterizer',
                        '--disable-background-networking',
                        '--disable-default-apps',
                        '--disable-sync',
                        '--disable-translate',
                        '--metrics-recording-only',
                        '--mute-audio',
                        '--no-default-browser-check',
                        '--safebrowsing-disable-auto-update',
                        '--disable-crash-reporter',
                        // Critical flags for Docker container
                        '--disable-features=VizDisplayCompositor',
                        '--user-data-dir=' + this.sessionPath,
                        // Use a unique remote debugging port
                        '--remote-debugging-port=9222',
                    ],
                },
            });

            // QR code event
            this.client.on('qr', async (qr: string) => {
                this.logger.log('📷 [QR] QR Code received, please scan it');
                this.qrCode = qr;
                if (this.session) {
                    this.session.qrCode = qr;
                    this.session.status = WhatsAppSessionStatus.QR_CODE;
                    await this.sessionRepo.save(this.session);
                }
            });

            // Ready event
            this.client.on('ready', async () => {
                this.logger.log('✅ [READY] WhatsApp client is ready!');
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
                this.logger.log(`📨 [MESSAGE] Incoming message event triggered from: ${msg.from}`);
                await this.handleIncomingMessage(msg);
            });

            // Disconnected event
            this.client.on('disconnected', async (reason: string) => {
                this.logger.warn(`❌ [DISCONNECT] WhatsApp client disconnected: ${reason}`);
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
                this.logger.error(`🚫 [AUTH] Authentication failure: ${msg}`);
                if (this.session) {
                    this.session.status = WhatsAppSessionStatus.FAILED;
                    this.session.errorMessage = msg;
                    await this.sessionRepo.save(this.session);
                }
            });

            // Initialize the client
            this.logger.log('⚙️ [INIT] Calling client.initialize()...');
            await this.client.initialize();

            this.logger.log('✅ [INIT] Client initialization call completed');
            if (this.session) {
                this.session.status = WhatsAppSessionStatus.CONNECTING;
                await this.sessionRepo.save(this.session);
            }
        } catch (error: any) {
            this.logger.error('❌ [INIT] Failed to initialize WhatsApp client', error);
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
            this.logger.log(`Received incoming WhatsApp message from: ${fromNumber}`);

            // Check if dev mode is enabled
            const isDevMode = process.env.WHATSAPP_DEV_MODE === 'true';
            const devNumber = process.env.WHATSAPP_DEV_NUMBER || '0833532301';
            const normalizedDevNumber = devNumber.replace(/\D/g, '');

            // In dev mode, if message is from test number, log it but still process normally
            if (isDevMode) {
                const normalizedFromNumber = fromNumber.replace(/\D/g, '');
                if (
                    normalizedFromNumber === normalizedDevNumber ||
                    normalizedFromNumber === normalizedDevNumber.replace(/^0/, '27')
                ) {
                    this.logger.log(
                        `[DEV MODE] Received message from test number ${devNumber}. Processing as incoming message.`
                    );
                }
            }

            // Try to find client by phone number with different formats
            // Format 1: Try the number as-is (e.g., 27833532301)
            let client = await this.clientRepo.findOne({
                where: { phoneNumber: fromNumber },
            });

            // Format 2: Try with leading 0 (e.g., 0833532301 from 27833532301)
            if (!client && fromNumber.startsWith('27')) {
                const withZero = '0' + fromNumber.substring(2);
                client = await this.clientRepo.findOne({
                    where: { phoneNumber: withZero },
                });
                this.logger.log(`Trying alternate format: ${withZero}`);
            }

            // Format 3: Try without country code if it starts with 27
            if (!client && fromNumber.startsWith('27')) {
                const withoutCountryCode = fromNumber.substring(2);
                client = await this.clientRepo.findOne({
                    where: { phoneNumber: withoutCountryCode },
                });
                this.logger.log(`Trying without country code: ${withoutCountryCode}`);
            }

            if (!client) {
                this.logger.warn(
                    `Received message from unknown number: ${fromNumber}. Tried multiple formats but no client found.`
                );
                // In dev mode, provide more helpful information
                if (isDevMode) {
                    this.logger.log(
                        `[DEV MODE] Tip: Make sure the client with number ${fromNumber} or ${fromNumber.startsWith('27') ? '0' + fromNumber.substring(2) : fromNumber} exists in the database.`
                    );
                }
                return;
            }

            this.logger.log(
                `Found client: ${client.firstName} ${client.lastName} (ID: ${client.id})`
            );

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
            // Remove all non-digits
            let cleanNumber = client.phoneNumber.replace(/\D/g, '');

            // Development mode: always send to test number
            const isDevMode = process.env.WHATSAPP_DEV_MODE === 'true';
            const devNumber = process.env.WHATSAPP_DEV_NUMBER || '0833532301';

            if (isDevMode) {
                this.logger.log(
                    `[DEV MODE] Redirecting message from ${client.phoneNumber} to test number ${devNumber}`
                );
                cleanNumber = devNumber.replace(/\D/g, '');
            }

            // If number starts with 0, replace with 27 (South Africa country code)
            if (cleanNumber.startsWith('0')) {
                cleanNumber = '27' + cleanNumber.substring(1);
            }

            // If number doesn't start with country code, assume South Africa
            if (!cleanNumber.startsWith('27') && cleanNumber.length === 9) {
                cleanNumber = '27' + cleanNumber;
            }

            const formattedNumber = cleanNumber + '@c.us';
            this.logger.log(
                `Sending message to ${client.phoneNumber} (formatted: ${formattedNumber})${isDevMode ? ' [DEV MODE]' : ''}`
            );

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
            try {
                await this.client.destroy();
            } catch (error: any) {
                this.logger.warn(`Error destroying client: ${error?.message}`);
            }
        }

        // Clean up lock files before deleting session
        this.cleanupLockFiles();

        // Delete session files
        if (fs.existsSync(this.sessionPath)) {
            try {
                fs.rmSync(this.sessionPath, { recursive: true, force: true });
                this.logger.log('Session files deleted');
            } catch (error: any) {
                this.logger.error(`Failed to delete session files: ${error?.message}`);
            }
        }

        // Recreate session directory
        if (!fs.existsSync(this.sessionPath)) {
            fs.mkdirSync(this.sessionPath, { recursive: true });
        }

        // Update database
        if (this.session) {
            this.session.status = WhatsAppSessionStatus.DISCONNECTED;
            this.session.qrCode = undefined;
            this.session.lastDisconnectedAt = new Date();
            await this.sessionRepo.save(this.session);
        }

        // Reset state
        this.client = null;
        this.qrCode = null;
        this.isReady = false;

        // Reinitialize
        await this.initializeClient();
    }
}
