import { Injectable, NotFoundException, ConflictException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere } from 'typeorm';
import { Client } from '@/entities/client.entity';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { SearchClientsDto } from './dto/search-clients.dto';

@Injectable()
export class ClientsService {
    private readonly logger = new Logger(ClientsService.name);

    constructor(
        @InjectRepository(Client)
        private readonly clientRepository: Repository<Client>
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

        return savedClient;
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
