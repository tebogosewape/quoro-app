# PHASE 3: Backend Financial Records — Execution Plan

**Status**: Ready to Execute
**Objective**: Implement REST endpoints for financial records CRUD operations; add database migrations if needed.

---

## Current State

### Backend Infrastructure (Already Exists)

- ✅ `FinancialRecord` entity (`apps/api/src/entities/financial-record.entity.ts`)
    - Schema: clientId, type (income/expense/etc), amount, description, recordedAt, metadata, isVerified
    - Relationship: belongs to Client (OneToMany from client perspective)
    - Database: `financial_records` table (from migration 1728570000000)

### What's Missing

- ❌ `financial-records` controller (needs to be created)
- ❌ `financial-records` service (needs to be created)
- ❌ `financial-records` module (needs to be created)
- ❌ `financial-records` DTOs (needs to be created)
- ❌ REST endpoints for CRUD operations

### Frontend Expectations (From Phase 2b)

- Frontend will call API to save income/expense data
- Format: Array of `MoneyRow` objects (id, label, amount)
- Need to transform: Array[MoneyRow] → Array[FinancialRecord]

---

## Implementation Plan

### Step 1: Create DTOs (Data Transfer Objects)

**File**: `apps/api/src/financial-records/financial-records.dto.ts`

```typescript
import {
    IsString,
    IsEnum,
    IsNumber,
    IsDate,
    IsObject,
    IsOptional,
    IsBoolean,
    IsUUID,
} from 'class-validator';
import { FinancialRecordType } from '../entities/financial-record.entity';

export class CreateFinancialRecordDto {
    @IsUUID()
    clientId!: string;

    @IsEnum(FinancialRecordType)
    type!: FinancialRecordType;

    @IsNumber()
    amount!: number;

    @IsString()
    @IsOptional()
    description?: string;

    @IsDate()
    @IsOptional()
    recordedAt?: Date;

    @IsObject()
    @IsOptional()
    metadata?: Record<string, unknown>;
}

export class UpdateFinancialRecordDto {
    @IsEnum(FinancialRecordType)
    @IsOptional()
    type?: FinancialRecordType;

    @IsNumber()
    @IsOptional()
    amount?: number;

    @IsString()
    @IsOptional()
    description?: string;

    @IsDate()
    @IsOptional()
    recordedAt?: Date;

    @IsObject()
    @IsOptional()
    metadata?: Record<string, unknown>;

    @IsBoolean()
    @IsOptional()
    isVerified?: boolean;
}

export class GetFinancialRecordsDto {
    @IsUUID()
    clientId!: string;

    @IsEnum(FinancialRecordType)
    @IsOptional()
    type?: FinancialRecordType;

    @IsNumber()
    @IsOptional()
    limit?: number;

    @IsNumber()
    @IsOptional()
    offset?: number;

    @IsString()
    @IsOptional()
    sortBy?: string;
}
```

### Step 2: Create Service

**File**: `apps/api/src/financial-records/financial-records.service.ts`

```typescript
import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FinancialRecord } from '../entities/financial-record.entity';
import { Client } from '../entities/client.entity';
import {
    CreateFinancialRecordDto,
    UpdateFinancialRecordDto,
    GetFinancialRecordsDto,
} from './financial-records.dto';

export interface FinancialRecordsResponse {
    records: FinancialRecord[];
    total: number;
    limit: number;
    offset: number;
}

@Injectable()
export class FinancialRecordsService {
    private readonly logger = new Logger(FinancialRecordsService.name);

    constructor(
        @InjectRepository(FinancialRecord)
        private financialRecordRepository: Repository<FinancialRecord>,
        @InjectRepository(Client)
        private clientRepository: Repository<Client>
    ) {}

    /**
     * Create a new financial record
     */
    async createRecord(dto: CreateFinancialRecordDto, createdBy: string): Promise<FinancialRecord> {
        // Verify client exists
        const client = await this.clientRepository.findOne({
            where: { id: dto.clientId },
        });
        if (!client) {
            throw new NotFoundException('Client not found');
        }

        const record = this.financialRecordRepository.create({
            ...dto,
            recordedAt: dto.recordedAt || new Date(),
            createdBy,
        });

        return this.financialRecordRepository.save(record);
    }

    /**
     * Get records for a client
     */
    async getRecords(dto: GetFinancialRecordsDto): Promise<FinancialRecordsResponse> {
        const { clientId, type, limit = 50, offset = 0, sortBy = 'recordedAt' } = dto;

        // Verify client exists
        const client = await this.clientRepository.findOne({
            where: { id: clientId },
        });
        if (!client) {
            throw new NotFoundException('Client not found');
        }

        const query = this.financialRecordRepository
            .createQueryBuilder('record')
            .where('record.clientId = :clientId', { clientId });

        if (type) {
            query.andWhere('record.type = :type', { type });
        }

        const [records, total] = await query
            .orderBy(`record.${sortBy}`, 'DESC')
            .limit(limit)
            .offset(offset)
            .getManyAndCount();

        return { records, total, limit, offset };
    }

    /**
     * Update a financial record
     */
    async updateRecord(recordId: string, dto: UpdateFinancialRecordDto): Promise<FinancialRecord> {
        const record = await this.financialRecordRepository.findOne({
            where: { id: recordId },
        });
        if (!record) {
            throw new NotFoundException('Financial record not found');
        }

        Object.assign(record, dto);
        return this.financialRecordRepository.save(record);
    }

    /**
     * Delete a financial record
     */
    async deleteRecord(recordId: string): Promise<void> {
        const result = await this.financialRecordRepository.delete(recordId);
        if (result.affected === 0) {
            throw new NotFoundException('Financial record not found');
        }
    }

    /**
     * Get summary of financial records for a client
     */
    async getSummary(clientId: string) {
        const client = await this.clientRepository.findOne({
            where: { id: clientId },
        });
        if (!client) {
            throw new NotFoundException('Client not found');
        }

        const records = await this.financialRecordRepository.find({
            where: { clientId },
        });

        const summary = {
            totalIncome: 0,
            totalExpenses: 0,
            totalDebt: 0,
            totalPayments: 0,
            disposableIncome: 0,
        };

        records.forEach((record) => {
            switch (record.type) {
                case 'income':
                    summary.totalIncome += Number(record.amount);
                    break;
                case 'expense':
                    summary.totalExpenses += Number(record.amount);
                    break;
                case 'debt_obligation':
                    summary.totalDebt += Number(record.amount);
                    break;
                case 'payment':
                    summary.totalPayments += Number(record.amount);
                    break;
            }
        });

        summary.disposableIncome = summary.totalIncome - summary.totalExpenses;

        return summary;
    }
}
```

### Step 3: Create Controller

**File**: `apps/api/src/financial-records/financial-records.controller.ts`

```typescript
import {
    Controller,
    Get,
    Post,
    Put,
    Delete,
    Body,
    Param,
    Query,
    UseGuards,
    Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '../auth/auth.guard';
import { FinancialRecordsService } from './financial-records.service';
import {
    CreateFinancialRecordDto,
    UpdateFinancialRecordDto,
    GetFinancialRecordsDto,
} from './financial-records.dto';

@ApiTags('financial-records')
@Controller('financial-records')
export class FinancialRecordsController {
    constructor(private financialRecordsService: FinancialRecordsService) {}

    @Post()
    @UseGuards(AuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Create a new financial record' })
    @ApiResponse({ status: 201, description: 'Financial record created' })
    async create(@Body() dto: CreateFinancialRecordDto, @Req() req: any) {
        return this.financialRecordsService.createRecord(dto, req.user.id);
    }

    @Get(':clientId')
    @UseGuards(AuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Get financial records for a client' })
    @ApiResponse({ status: 200, description: 'Financial records retrieved' })
    async getByClient(
        @Param('clientId') clientId: string,
        @Query('type') type?: string,
        @Query('limit') limit?: number,
        @Query('offset') offset?: number
    ) {
        return this.financialRecordsService.getRecords({
            clientId,
            type: type as any,
            limit,
            offset,
        });
    }

    @Get(':clientId/summary')
    @UseGuards(AuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Get financial summary for a client' })
    @ApiResponse({ status: 200, description: 'Summary retrieved' })
    async getSummary(@Param('clientId') clientId: string) {
        return this.financialRecordsService.getSummary(clientId);
    }

    @Put(':recordId')
    @UseGuards(AuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Update a financial record' })
    @ApiResponse({ status: 200, description: 'Record updated' })
    async update(@Param('recordId') recordId: string, @Body() dto: UpdateFinancialRecordDto) {
        return this.financialRecordsService.updateRecord(recordId, dto);
    }

    @Delete(':recordId')
    @UseGuards(AuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Delete a financial record' })
    @ApiResponse({ status: 200, description: 'Record deleted' })
    async delete(@Param('recordId') recordId: string) {
        await this.financialRecordsService.deleteRecord(recordId);
        return { message: 'Record deleted' };
    }
}
```

### Step 4: Create Module

**File**: `apps/api/src/financial-records/financial-records.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FinancialRecord } from '../entities/financial-record.entity';
import { Client } from '../entities/client.entity';
import { FinancialRecordsService } from './financial-records.service';
import { FinancialRecordsController } from './financial-records.controller';

@Module({
    imports: [TypeOrmModule.forFeature([FinancialRecord, Client])],
    controllers: [FinancialRecordsController],
    providers: [FinancialRecordsService],
    exports: [FinancialRecordsService],
})
export class FinancialRecordsModule {}
```

### Step 5: Register Module in App Module

**File**: `apps/api/src/app.module.ts` (Update imports)

```typescript
import { FinancialRecordsModule } from './financial-records/financial-records.module';

@Module({
    imports: [
        // ... existing imports
        FinancialRecordsModule,
    ],
})
export class AppModule {}
```

---

## REST Endpoints

### POST /financial-records

Create a new financial record.

**Request**:

```json
{
    "clientId": "550e8400-e29b-41d4-a716-446655440000",
    "type": "income",
    "amount": 5000.0,
    "description": "Monthly salary",
    "recordedAt": "2025-01-20T00:00:00Z",
    "metadata": {
        "frequency": "monthly",
        "employer": "ABC Corp"
    }
}
```

**Response** (201):

```json
{
    "id": "550e8400-e29b-41d4-a716-446655440001",
    "clientId": "550e8400-e29b-41d4-a716-446655440000",
    "type": "income",
    "amount": "5000.00",
    "description": "Monthly salary",
    "recordedAt": "2025-01-20T00:00:00Z",
    "metadata": { "frequency": "monthly", "employer": "ABC Corp" },
    "isVerified": false,
    "createdAt": "2025-01-20T10:00:00Z",
    "createdBy": "user-uuid"
}
```

### GET /financial-records/:clientId

Get financial records for a client.

**Query Parameters**:

- `type`: Optional filter by type (income, expense, debt_obligation, etc.)
- `limit`: Max results (default 50)
- `offset`: Pagination offset (default 0)

**Response** (200):

```json
{
    "records": [
        { "id": "...", "type": "income", "amount": "5000.00", ... },
        { "id": "...", "type": "expense", "amount": "1000.00", ... }
    ],
    "total": 42,
    "limit": 50,
    "offset": 0
}
```

### GET /financial-records/:clientId/summary

Get summary of financial records.

**Response** (200):

```json
{
    "totalIncome": 15000,
    "totalExpenses": 5000,
    "totalDebt": 30000,
    "totalPayments": 2000,
    "disposableIncome": 10000
}
```

### PUT /financial-records/:recordId

Update a financial record.

**Request** (partial):

```json
{
    "amount": 5500.0,
    "description": "Updated salary",
    "isVerified": true
}
```

### DELETE /financial-records/:recordId

Delete a financial record.

---

## Testing Strategy

### Unit Tests

```bash
npm -w apps/api test -- financial-records.service.spec.ts
```

**Test Cases**:

- ✅ Create record with valid data
- ✅ Create record for non-existent client (should fail)
- ✅ Get records for client
- ✅ Get records filtered by type
- ✅ Get summary correctly calculates totals
- ✅ Update record
- ✅ Delete record
- ✅ Verify authorization (only own client's records)

### Integration Tests

```bash
npm -w apps/api test:e2e
```

- ✅ POST → GET → PUT → DELETE flow
- ✅ Pagination works (offset/limit)
- ✅ JWT auth required

### Manual Testing

```bash
# Create record
curl -X POST http://localhost:3001/financial-records \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"clientId":"...","type":"income","amount":5000}'

# Get records
curl http://localhost:3001/financial-records/CLIENT_ID \
  -H "Authorization: Bearer $TOKEN"
```

---

## Definition of Done

- [ ] DTOs created with validation
- [ ] Service implements CRUD + summary
- [ ] Controller implements all endpoints
- [ ] Module registered in app.module.ts
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] TypeScript compiles clean
- [ ] No console errors
- [ ] Swagger documentation auto-generated
- [ ] Auth guards applied

---

## Scope & Limitations

**In Scope**:

- Basic CRUD for financial records
- Type filtering (income, expense, etc.)
- Pagination
- Summary calculations
- JWT auth

**Out of Scope**:

- Bulk operations (Phase 4)
- Advanced analytics (Phase 4)
- Import/export (Future)
- Audit trail (separate service)

---

## Implementation Order

1. **Create DTOs** (10 min)
2. **Create Service** (30 min)
3. **Create Controller** (30 min)
4. **Create Module** (5 min)
5. **Register in AppModule** (5 min)
6. **Unit Tests** (30 min)
7. **Manual Test** (20 min)
8. **Commit** (5 min)

**Total Estimate**: 2-2.5 hours

---

## Database

### Existing Table (from migration)

```sql
CREATE TABLE `financial_records` (
    `id` VARCHAR(36) NOT NULL,
    `client_id` VARCHAR(36) NOT NULL,
    `type` VARCHAR(40) NOT NULL,
    `amount` DECIMAL(12, 2) NOT NULL,
    `description` VARCHAR(255),
    `recorded_at` DATETIME NOT NULL,
    `metadata` JSON,
    `is_verified` BOOLEAN DEFAULT FALSE,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `created_by` VARCHAR(36),
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `updated_by` VARCHAR(36),
    PRIMARY KEY (`id`),
    INDEX (`client_id`),
    INDEX (`type`),
    INDEX (`recorded_at`),
    FOREIGN KEY (`client_id`) REFERENCES `clients` (`id`) ON DELETE CASCADE
);
```

**No migrations needed** — table already exists!

---

## Next: Phase 3b

After Phase 3a is complete:

1. Create `financial-records.api.ts` in frontend (TypeScript wrapper)
2. Create transform layer for income/expense format
3. Update `IncomeExpenseForm` to use real API

---

**Ready to Execute**: Yes
