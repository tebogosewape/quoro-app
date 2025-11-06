import { Injectable, NotFoundException, ConflictException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere } from 'typeorm';
import { Client } from '@/entities/client.entity';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { SearchClientsDto } from './dto/search-clients.dto';
import { MailService } from '@/mail/mail.service';
import { ZoomConnectService } from '@/sms/zoomconnect.service';
import { WhatsappService } from '@/whatsapp/whatsapp.service';
import { AuditService } from '@/modules/audit/audit.service';
import { AuditAction } from '@/entities/audit-log.entity';

@Injectable()
export class ClientsService {
    private readonly logger = new Logger(ClientsService.name);

    constructor(
        @InjectRepository(Client)
        private readonly clientRepository: Repository<Client>,
        private readonly mailService: MailService,
        private readonly smsService: ZoomConnectService,
        private readonly whatsappService: WhatsappService,
        private readonly auditService: AuditService
    ) {}

    /**
     * Create a new client from onboarding wizard
     */
    async create(createClientDto: CreateClientDto, userId?: string): Promise<Client> {
        this.logger.log(`Creating new client with ID number: ${createClientDto.idNumber}`);

        // Check if client with same ID number already exists
        const existingClient = await this.clientRepository.findOne({
            where: { idNumber: createClientDto.idNumber },
        });

        if (existingClient) {
            throw new ConflictException(
                `Client with ID number ${createClientDto.idNumber} already exists`
            );
        }

        // Check if email already exists
        const existingEmail = await this.clientRepository.findOne({
            where: { email: createClientDto.email.toLowerCase() },
        });

        if (existingEmail) {
            throw new ConflictException(
                `Client with email ${createClientDto.email} already exists`
            );
        }

        const client = this.clientRepository.create({
            ...createClientDto,
            email: createClientDto.email.toLowerCase(),
            createdBy: userId,
            updatedBy: userId,
        });

        const savedClient = await this.clientRepository.save(client);
        this.logger.log(`Client created successfully with ID: ${savedClient.id}`);

        // Send welcome communications asynchronously (don't block the response)
        this.sendWelcomeCommunications(savedClient, userId).catch((error) => {
            this.logger.error(
                `Failed to send welcome communications for client ${savedClient.id}:`,
                error
            );
        });

        return savedClient;
    }

    /**
     * Send welcome communications to newly onboarded client
     * Sends email, SMS, and WhatsApp message, then logs in audit trail
     */
    private async sendWelcomeCommunications(client: Client, userId?: string): Promise<void> {
        const firstName = client.firstName || 'Valued Client';
        const fullName = `${client.firstName} ${client.lastName}`.trim() || 'Valued Client';

        // Email content
        const emailSubject = 'Welcome to Quora Finance - Your Application is Being Processed';
        const emailHtml = `
            <html>
                <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                    <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                        <h2 style="color: #2c3e50;">Welcome to Quora Finance, ${firstName}!</h2>
                        <p>Thank you for choosing Quora Finance. We have successfully received your application.</p>
                        <p><strong>Application Details:</strong></p>
                        <ul>
                            <li>Client ID: ${client.id}</li>
                            <li>Name: ${fullName}</li>
                            <li>Email: ${client.email}</li>
                            <li>Phone: ${client.phoneNumber}</li>
                        </ul>
                        <p>Our team will review your application and contact you shortly with the next steps.</p>
                        <p>If you have any questions, please don't hesitate to contact us.</p>
                        <p style="margin-top: 30px;">Best regards,<br><strong>Quora Finance Team</strong></p>
                    </div>
                </body>
            </html>
        `;

        // SMS content (keep it short)
        const smsMessage = `Welcome to Quora Finance, ${firstName}! Your application has been received. Our team will contact you shortly. Ref: ${client.id.substring(0, 8)}`;

        // WhatsApp content
        const whatsappMessage = `Hi ${firstName},\n\nWelcome to Quora Finance! ✨\n\nYour application has been successfully received and is being processed.\n\nReference: ${client.id.substring(0, 8)}\n\nOur team will contact you shortly with the next steps.\n\nThank you for choosing us!`;

        const results = {
            email: { success: false, error: null as Error | null },
            sms: { success: false, error: null as Error | null },
            whatsapp: { success: false, error: null as Error | null },
        };

        // Send email
        try {
            await this.mailService.sendMail({
                to: [client.email],
                subject: emailSubject,
                html: emailHtml,
            });
            results.email.success = true;
            this.logger.log(`Welcome email sent to ${client.email}`);
        } catch (error) {
            results.email.error = error as Error;
            this.logger.error(`Failed to send welcome email to ${client.email}:`, error);
        }

        // Send SMS
        try {
            const normalizedPhone = this.normalizePhone(client.phoneNumber);
            if (normalizedPhone) {
                await this.smsService.send(
                    {
                        message: smsMessage,
                        recipientNumber: normalizedPhone,
                    },
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    { id: userId || 'system', email: 'system', role: 'system' } as any
                );
                results.sms.success = true;
                this.logger.log(`Welcome SMS sent to ${normalizedPhone}`);
            }
        } catch (error) {
            results.sms.error = error as Error;
            this.logger.error(`Failed to send welcome SMS to ${client.phoneNumber}:`, error);
        }

        // Send WhatsApp
        try {
            const normalizedPhone = this.normalizePhone(client.phoneNumber);
            if (normalizedPhone) {
                await this.whatsappService.sendText(normalizedPhone, whatsappMessage);
                results.whatsapp.success = true;
                this.logger.log(`Welcome WhatsApp sent to ${normalizedPhone}`);
            }
        } catch (error) {
            results.whatsapp.error = error as Error;
            this.logger.error(`Failed to send welcome WhatsApp to ${client.phoneNumber}:`, error);
        }

        // Log communications in audit trail
        await this.auditService.logEvent({
            action: AuditAction.CREATE,
            entityType: 'client_communication',
            entityId: client.id,
            actorId: userId,
            metadata: {
                clientId: client.id,
                clientName: fullName,
                clientEmail: client.email,
                clientPhone: client.phoneNumber,
                communications: {
                    email: {
                        sent: results.email.success,
                        error: results.email.error?.message,
                    },
                    sms: {
                        sent: results.sms.success,
                        error: results.sms.error?.message,
                    },
                    whatsapp: {
                        sent: results.whatsapp.success,
                        error: results.whatsapp.error?.message,
                    },
                },
            },
        });
    }

    /**
     * Normalize phone number to international format (remove leading 0, add 27)
     */
    private normalizePhone(phone: string): string | null {
        if (!phone) return null;
        const digits = phone.replace(/\D/g, '');
        if (digits.startsWith('0')) {
            return '27' + digits.slice(1);
        }
        if (digits.startsWith('27')) {
            return digits;
        }
        return digits;
    }

    /**
     * Find all clients with pagination and filtering
     */
    async findAll(searchDto: SearchClientsDto): Promise<{
        data: Client[];
        meta: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
    }> {
        const {
            search,
            status,
            assignedAgentId,
            page = 1,
            limit = 10,
            sortBy = 'createdAt',
            sortOrder = 'DESC',
        } = searchDto;

        const where: FindOptionsWhere<Client> = {};

        if (status) {
            where.status = status;
        }

        if (assignedAgentId) {
            where.assignedAgentId = assignedAgentId;
        }

        const queryBuilder = this.clientRepository.createQueryBuilder('client');

        if (search) {
            queryBuilder.where(
                '(client.firstName LIKE :search OR client.lastName LIKE :search OR client.email LIKE :search OR client.idNumber LIKE :search OR client.phoneNumber LIKE :search)',
                { search: `%${search}%` }
            );
        }

        if (status) {
            queryBuilder.andWhere('client.status = :status', { status });
        }

        if (assignedAgentId) {
            queryBuilder.andWhere('client.assignedAgentId = :assignedAgentId', {
                assignedAgentId,
            });
        }

        const total = await queryBuilder.getCount();

        const data = await queryBuilder
            .orderBy(`client.${sortBy}`, sortOrder)
            .skip((page - 1) * limit)
            .take(limit)
            .getMany();

        // Transform selectedProducts to fix any legacy data format issues
        const sanitizedData = data.map((client) => {
            if (client.selectedProducts && Array.isArray(client.selectedProducts)) {
                // Fix any nested arrays (legacy data format)
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                client.selectedProducts = client.selectedProducts.map((product: any) => {
                    // If product is an array (bad data), extract the first element
                    if (Array.isArray(product)) {
                        return product[0] || { productId: '', paymentOptionId: '' };
                    }
                    return product;
                });
            }
            return client;
        });

        return {
            data: sanitizedData,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        };
    }

    /**
     * Find a single client by ID
     */
    async findOne(id: string): Promise<Client> {
        const client = await this.clientRepository.findOne({
            where: { id },
        });

        if (!client) {
            throw new NotFoundException(`Client with ID ${id} not found`);
        }

        // Fix any legacy data format issues
        if (client.selectedProducts && Array.isArray(client.selectedProducts)) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            client.selectedProducts = client.selectedProducts.map((product: any) => {
                // If product is an array (bad data), extract the first element
                if (Array.isArray(product)) {
                    return product[0] || { productId: '', paymentOptionId: '' };
                }
                return product;
            });
        }

        return client;
    }

    /**
     * Update a client
     */
    async update(id: string, updateClientDto: UpdateClientDto, userId?: string): Promise<Client> {
        const client = await this.findOne(id);

        // Check for ID number conflict if being updated
        if (updateClientDto.idNumber && updateClientDto.idNumber !== client.idNumber) {
            const existingClient = await this.clientRepository.findOne({
                where: { idNumber: updateClientDto.idNumber },
            });

            if (existingClient) {
                throw new ConflictException(
                    `Client with ID number ${updateClientDto.idNumber} already exists`
                );
            }
        }

        // Check for email conflict if being updated
        if (updateClientDto.email && updateClientDto.email.toLowerCase() !== client.email) {
            const existingEmail = await this.clientRepository.findOne({
                where: { email: updateClientDto.email.toLowerCase() },
            });

            if (existingEmail) {
                throw new ConflictException(
                    `Client with email ${updateClientDto.email} already exists`
                );
            }
        }

        Object.assign(client, {
            ...updateClientDto,
            email: updateClientDto.email?.toLowerCase() || client.email,
            updatedBy: userId,
        });

        const updatedClient = await this.clientRepository.save(client);
        this.logger.log(`Client updated successfully: ${updatedClient.id}`);

        return updatedClient;
    }

    /**
     * Soft delete a client
     */
    async remove(id: string): Promise<void> {
        const client = await this.findOne(id);
        await this.clientRepository.softRemove(client);
        this.logger.log(`Client soft deleted: ${id}`);
    }

    /**
     * Get client statistics
     */
    async getStats(): Promise<{
        total: number;
        byStatus: Record<string, number>;
    }> {
        const total = await this.clientRepository.count();

        const statusCounts = await this.clientRepository
            .createQueryBuilder('client')
            .select('client.status', 'status')
            .addSelect('COUNT(*)', 'count')
            .groupBy('client.status')
            .getRawMany();

        const byStatus: Record<string, number> = {};
        statusCounts.forEach((row) => {
            byStatus[row.status] = parseInt(row.count, 10);
        });

        return {
            total,
            byStatus,
        };
    }
}
