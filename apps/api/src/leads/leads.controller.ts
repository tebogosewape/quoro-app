import {
    Controller,
    Post,
    Get,
    Patch,
    Param,
    Query,
    UploadedFile,
    UseInterceptors,
    Body,
    BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'node:path';
import { LeadsService } from './leads.service';
import { ApiTags, ApiOperation, ApiConsumes, ApiBody, ApiResponse } from '@nestjs/swagger';
import { QueryLeadsDto } from './dto/query-leads.dto';
import { UpdateLeadDto } from './dto/update-lead.dto';

@ApiTags('Leads')
@Controller('leads')
export class LeadsController {
    constructor(private readonly leadsService: LeadsService) {}

    /**
     * Upload and import a CSV.
     * CURL example:
     * curl -F file=@exportdata.csv http://localhost:3000/leads/import
     */
    @Post('import')
    @ApiOperation({
        summary: 'Import leads from CSV file',
        description:
            'Upload a CSV file to import lead data. CSV must have headers: Time Received, Franchise, Name, Cell, ID Number, Affiliate, Message, Allocated to, Lead Outcome',
    })
    @ApiConsumes('multipart/form-data')
    @ApiBody({
        description: 'CSV file with lead data',
        schema: {
            type: 'object',
            properties: {
                file: {
                    type: 'string',
                    format: 'binary',
                    description: 'CSV file (max 20MB)',
                },
            },
        },
    })
    @ApiResponse({
        status: 200,
        description: 'CSV imported successfully',
        schema: {
            type: 'object',
            properties: {
                success: { type: 'boolean', example: true },
                inserted: { type: 'number', example: 150 },
                updated: { type: 'number', example: 0 },
            },
        },
    })
    @ApiResponse({
        status: 400,
        description: 'Bad request - invalid file or missing file',
    })
    @UseInterceptors(
        FileInterceptor('file', {
            storage: diskStorage({
                destination: './uploads',
                filename: (_req, file, cb) => {
                    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
                    cb(null, unique + extname(file.originalname));
                },
            }),
            fileFilter: (_req, file, cb) => {
                const ok = /csv|plain/.test(file.mimetype) || file.originalname.endsWith('.csv');
                cb(ok ? null : new BadRequestException('Only CSV files are allowed'), ok);
            },
            limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
        })
    )
    async importCsv(@UploadedFile() file?: Express.Multer.File) {
        if (!file) throw new BadRequestException('file is required');
        const result = await this.leadsService.importFromCsv(file.path);
        return { success: true, ...result };
    }

    /** Import from a server file path (ops use). */
    @Post('import/path')
    @ApiOperation({
        summary: 'Import leads from server file path',
        description:
            'Import leads from a CSV file already on the server (operations/admin use). Requires server file path.',
    })
    @ApiBody({
        description: 'Server file path to CSV',
        schema: {
            type: 'object',
            properties: {
                path: {
                    type: 'string',
                    example: '/var/data/leads/exportdata.csv',
                    description: 'Absolute path to CSV file on server',
                },
            },
            required: ['path'],
        },
    })
    @ApiResponse({
        status: 200,
        description: 'CSV imported successfully',
        schema: {
            type: 'object',
            properties: {
                success: { type: 'boolean', example: true },
                inserted: { type: 'number', example: 150 },
                updated: { type: 'number', example: 0 },
            },
        },
    })
    @ApiResponse({
        status: 400,
        description: 'Bad request - missing or invalid path',
    })
    async importFromPath(@Body('path') path: string) {
        if (!path) throw new BadRequestException('path is required');
        const result = await this.leadsService.importFromCsv(path);
        return { success: true, ...result };
    }

    /** Get all leads with pagination and filtering */
    @Get()
    @ApiOperation({
        summary: 'Get all leads',
        description: 'Retrieve a paginated list of leads with optional filtering and search',
    })
    @ApiResponse({
        status: 200,
        description: 'Leads retrieved successfully',
        schema: {
            type: 'object',
            properties: {
                success: { type: 'boolean', example: true },
                data: {
                    type: 'object',
                    properties: {
                        leads: {
                            type: 'array',
                            items: {
                                type: 'object',
                                properties: {
                                    id: { type: 'string', example: 'uuid-here' },
                                    timeReceived: {
                                        type: 'string',
                                        example: '2025-11-05T10:30:00Z',
                                    },
                                    franchise: { type: 'string', example: 'JHB North' },
                                    name: { type: 'string', example: 'John Doe' },
                                    cell: { type: 'string', example: '0821234567' },
                                    idNumber: { type: 'string', example: '8501015800081' },
                                    affiliate: { type: 'string', example: 'Google Ads' },
                                    message: {
                                        type: 'string',
                                        example: 'Interested in debt review',
                                    },
                                    allocatedTo: { type: 'string', example: 'Agent Smith' },
                                    leadOutcome: { type: 'string', example: 'Pending' },
                                    createdAt: { type: 'string', example: '2025-11-05T10:30:00Z' },
                                    updatedAt: { type: 'string', example: '2025-11-05T10:30:00Z' },
                                },
                            },
                        },
                        total: { type: 'number', example: 250 },
                        page: { type: 'number', example: 1 },
                        limit: { type: 'number', example: 20 },
                        totalPages: { type: 'number', example: 13 },
                    },
                },
            },
        },
    })
    async findAll(@Query() query: QueryLeadsDto) {
        const result = await this.leadsService.findAll(query);
        return { success: true, data: result };
    }

    /**
     * Get a single lead by ID
     */
    @Get(':id')
    @ApiOperation({
        summary: 'Get lead by ID',
        description: 'Retrieve a single lead by its UUID',
    })
    @ApiResponse({
        status: 200,
        description: 'Lead retrieved successfully',
        schema: {
            type: 'object',
            properties: {
                success: { type: 'boolean', example: true },
                data: {
                    type: 'object',
                    properties: {
                        id: { type: 'string', example: 'uuid-here' },
                        timeReceived: { type: 'string', example: '2025-11-05T10:30:00Z' },
                        franchise: { type: 'string', example: 'JHB North' },
                        name: { type: 'string', example: 'John Doe' },
                        cell: { type: 'string', example: '0821234567' },
                        idNumber: { type: 'string', example: '8501015800081' },
                        affiliate: { type: 'string', example: 'Google Ads' },
                        message: { type: 'string', example: 'Interested in debt review' },
                        allocatedTo: { type: 'string', example: 'Agent Smith' },
                        leadOutcome: { type: 'string', example: 'Pending' },
                        createdAt: { type: 'string', example: '2025-11-05T10:30:00Z' },
                        updatedAt: { type: 'string', example: '2025-11-05T10:30:00Z' },
                    },
                },
            },
        },
    })
    @ApiResponse({
        status: 404,
        description: 'Lead not found',
    })
    async findOne(@Param('id') id: string) {
        const lead = await this.leadsService.findOne(id);
        return { success: true, data: lead };
    }

    /**
     * Update a lead (e.g., assign to agent)
     */
    @Patch(':id')
    @ApiOperation({
        summary: 'Update lead',
        description: 'Update lead information such as allocatedTo, leadOutcome, etc.',
    })
    @ApiBody({
        description: 'Lead update data',
        schema: {
            type: 'object',
            properties: {
                allocatedTo: { type: 'string', example: 'Agent Smith', nullable: true },
                leadOutcome: { type: 'string', example: 'Converted', nullable: true },
                franchise: { type: 'string', example: 'JHB North', nullable: true },
                name: { type: 'string', example: 'John Doe', nullable: true },
                message: { type: 'string', example: 'Updated message', nullable: true },
            },
        },
    })
    @ApiResponse({
        status: 200,
        description: 'Lead updated successfully',
        schema: {
            type: 'object',
            properties: {
                success: { type: 'boolean', example: true },
                data: {
                    type: 'object',
                    properties: {
                        id: { type: 'string', example: 'uuid-here' },
                        allocatedTo: { type: 'string', example: 'Agent Smith' },
                        leadOutcome: { type: 'string', example: 'Converted' },
                    },
                },
            },
        },
    })
    @ApiResponse({
        status: 404,
        description: 'Lead not found',
    })
    async update(@Param('id') id: string, @Body() updateDto: UpdateLeadDto) {
        const lead = await this.leadsService.update(id, updateDto);
        return { success: true, data: lead };
    }
}
