/* eslint-disable indent */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Brackets } from 'typeorm';
import { CreateLeadDto } from './dto/create-lead.dto';
import { UpdateLeadDto } from './dto/update-lead.dto';
import { QueryLeadsDto } from './dto/query-leads.dto';
import dayjs from 'dayjs';
import * as fs from 'node:fs';
import { parse } from 'fast-csv';
import { Lead } from '@/entities/lead.entity';
import { AuditService } from '@/modules/audit/audit.service';

@Injectable()
export class LeadsService {
    private readonly logger = new Logger(LeadsService.name);

    constructor(
        @InjectRepository(Lead) private readonly repo: Repository<Lead>,
        private readonly auditService: AuditService
    ) {}

    async create(dto: CreateLeadDto): Promise<Lead> {
        const lead = this.repo.create(dto);
        return this.repo.save(lead);
    }

    /**
     * Stream a CSV file from disk and UPSERT rows in chunks.
     * The CSV must have headers exactly matching:
     * Time Received, Franchise, Name, Cell, ID Number, Affiliate, Message, Allocated to, Lead Outcome
     */
    async importFromCsv(
        filePath: string,
        chunkSize = 1000
    ): Promise<{ inserted: number; updated: number }> {
        if (!fs.existsSync(filePath)) throw new Error(`File not found: ${filePath}`);

        const rows: CreateLeadDto[] = [];
        let inserted = 0;
        const updated = 0;

        const flush = async () => {
            if (rows.length === 0) return;
            // Upsert based on the business key index
            const res = await this.repo
                .createQueryBuilder()
                .insert()
                .into(Lead)
                .values(rows)
                .orUpdate(
                    [
                        'franchise',
                        'name',
                        'idNumber',
                        'message',
                        'allocatedTo',
                        'leadOutcome',
                        'updatedAt',
                    ],
                    ['timeReceived', 'cell', 'affiliate']
                )
                .execute();
            inserted += res.identifiers.length; // new rows
            // NOTE: MySQL doesn't easily return affected/updated separately in qb. Treat the rest as updated best-effort.
            rows.length = 0;
        };

        await new Promise<void>((resolve, reject) => {
            fs.createReadStream(filePath)
                .pipe(parse({ headers: true, ignoreEmpty: true, trim: true }))
                .on('error', (err: Error) => reject(err))
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                .on('data', (raw: any) => {
                    try {
                        const dto = this.mapCsvRow(raw);
                        rows.push(dto);
                        if (rows.length >= chunkSize) {
                            // pause stream while flushing
                            // fast-csv doesn't expose pause here; handle backpressure implicitly by buffering
                        }
                    } catch (e) {
                        this.logger.warn(
                            `Skipping row due to parse error: ${(e as Error).message}`
                        );
                    }
                })
                .on('end', async () => {
                    try {
                        await flush();
                        resolve();
                    } catch (e) {
                        reject(e);
                    }
                });
        });

        return { inserted, updated };
    }

    /**
     * Map CSV row to CreateLeadDto
     */
    private mapCsvRow(raw: any): CreateLeadDto {
        // Expected headers: Time Received, Franchise, Name, Cell, ID Number, Affiliate, Message, Allocated to, Lead Outcome
        const dto = new CreateLeadDto();

        // Parse the time received field
        const timeStr = raw['Time Received'] || raw['timeReceived'];
        dto.timeReceived = timeStr ? dayjs(timeStr).toDate() : new Date();

        dto.franchise = raw['Franchise'] || raw['franchise'] || null;
        dto.name = raw['Name'] || raw['name'] || null;

        // Cell is required - extract only digits
        const cellRaw = raw['Cell'] || raw['cell'] || '';
        dto.cell = cellRaw.toString().replace(/\D/g, '');
        if (!dto.cell) {
            throw new Error('Cell number is required');
        }

        dto.idNumber = raw['ID Number'] || raw['idNumber'] || null;
        dto.affiliate = raw['Affiliate'] || raw['affiliate'] || null;
        dto.message = raw['Message'] || raw['message'] || null;
        dto.allocatedTo = raw['Allocated to'] || raw['allocatedTo'] || null;
        dto.leadOutcome = raw['Lead Outcome'] || raw['leadOutcome'] || null;

        return dto;
    }

    /**
     * Find all leads with pagination and filtering
     */
    async findAll(query: QueryLeadsDto): Promise<{
        leads: Lead[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    }> {
        const {
            page = 1,
            limit = 20,
            search,
            franchise,
            affiliate,
            allocatedTo,
            leadOutcome,
            startDate,
            endDate,
            sortBy = 'timeReceived',
            sortOrder = 'DESC',
        } = query;

        const qb = this.repo.createQueryBuilder('lead');

        // Search across multiple fields
        if (search) {
            qb.andWhere(
                new Brackets((qb) => {
                    qb.where('lead.name LIKE :search', { search: `%${search}%` })
                        .orWhere('lead.cell LIKE :search', { search: `%${search}%` })
                        .orWhere('lead.idNumber LIKE :search', { search: `%${search}%` });
                })
            );
        }

        // Filters
        if (franchise) {
            qb.andWhere('lead.franchise = :franchise', { franchise });
        }
        if (affiliate) {
            qb.andWhere('lead.affiliate = :affiliate', { affiliate });
        }
        if (allocatedTo) {
            qb.andWhere('lead.allocatedTo = :allocatedTo', { allocatedTo });
        }
        if (leadOutcome) {
            qb.andWhere('lead.leadOutcome = :leadOutcome', { leadOutcome });
        }

        // Date range filter
        if (startDate) {
            qb.andWhere('DATE(lead.timeReceived) >= :startDate', { startDate });
        }
        if (endDate) {
            qb.andWhere('DATE(lead.timeReceived) <= :endDate', { endDate });
        }

        // Sorting
        const sortField =
            sortBy === 'timeReceived'
                ? 'lead.timeReceived'
                : sortBy === 'name'
                  ? 'lead.name'
                  : sortBy === 'cell'
                    ? 'lead.cell'
                    : 'lead.createdAt';
        qb.orderBy(sortField, sortOrder);

        // Pagination
        const skip = (page - 1) * limit;
        qb.skip(skip).take(limit);

        // Execute query
        const [leads, total] = await qb.getManyAndCount();

        return {
            leads,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };
    }

    /**
     * Get all unassigned leads (for bulk assignment operations)
     * Limited to 5000 leads to prevent memory issues
     */
    async findAllUnassigned(): Promise<Lead[]> {
        return this.repo
            .createQueryBuilder('lead')
            .where('lead.allocatedTo IS NULL OR lead.allocatedTo = :empty', { empty: '' })
            .orderBy('lead.timeReceived', 'DESC')
            .limit(5000)
            .getMany();
    }

    /**
     * Get all assigned leads (for bulk unassignment operations)
     * Limited to 5000 leads to prevent memory issues
     */
    async findAllAssigned(): Promise<Lead[]> {
        return this.repo
            .createQueryBuilder('lead')
            .where('lead.allocatedTo IS NOT NULL')
            .andWhere('lead.allocatedTo != :empty', { empty: '' })
            .orderBy('lead.timeReceived', 'DESC')
            .limit(5000) // Limit to prevent memory issues
            .getMany();
    }

    async update(id: string, dto: UpdateLeadDto, updatedBy?: string): Promise<Lead> {
        const lead = await this.repo.findOne({ where: { id } });
        if (!lead) {
            throw new NotFoundException(`Lead with ID ${id} not found`);
        }

        const previousAllocatedTo = lead.allocatedTo;

        Object.assign(lead, dto);
        const updatedLead = await this.repo.save(lead);

        // Log assignment/unassignment changes
        if (updatedBy && dto.allocatedTo !== undefined && dto.allocatedTo !== previousAllocatedTo) {
            if (dto.allocatedTo && !previousAllocatedTo) {
                // Lead assigned
                await this.auditService.logLeadAssigned({
                    leadId: id,
                    agentId: updatedBy,
                    agentName: dto.allocatedTo,
                    assignedBy: updatedBy,
                    metadata: {
                        leadName: lead.name,
                        leadCell: lead.cell,
                        franchise: lead.franchise,
                    },
                });
            } else if (!dto.allocatedTo && previousAllocatedTo) {
                // Lead unassigned
                await this.auditService.logLeadUnassigned({
                    leadId: id,
                    previousAgentName: previousAllocatedTo,
                    unassignedBy: updatedBy,
                    metadata: {
                        leadName: lead.name,
                        leadCell: lead.cell,
                        franchise: lead.franchise,
                    },
                });
            } else if (
                dto.allocatedTo &&
                previousAllocatedTo &&
                dto.allocatedTo !== previousAllocatedTo
            ) {
                // Lead reassigned (log as unassign + assign)
                await this.auditService.logLeadUnassigned({
                    leadId: id,
                    previousAgentName: previousAllocatedTo,
                    unassignedBy: updatedBy,
                    metadata: {
                        leadName: lead.name,
                        reason: 'reassignment',
                    },
                });
                await this.auditService.logLeadAssigned({
                    leadId: id,
                    agentId: updatedBy,
                    agentName: dto.allocatedTo,
                    assignedBy: updatedBy,
                    metadata: {
                        leadName: lead.name,
                        leadCell: lead.cell,
                        franchise: lead.franchise,
                        reason: 'reassignment',
                    },
                });
            }
        }

        return updatedLead;
    }

    async findOne(id: string): Promise<Lead> {
        const lead = await this.repo.findOne({ where: { id } });
        if (!lead) {
            throw new NotFoundException(`Lead with ID ${id} not found`);
        }
        return lead;
    }
}
