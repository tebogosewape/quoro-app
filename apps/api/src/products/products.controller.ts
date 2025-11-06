// apps/api/src/modules/products/products.controller.ts
import {
    Controller,
    Get,
    Post,
    Put,
    Delete,
    Body,
    Param,
    Query,
    ParseUUIDPipe,
    UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery, ApiParam } from '@nestjs/swagger';
import { ProductsService } from './products.service';
import { CreateProductDto, UpdateProductDto, ProductListQuery } from './products.dto';
import { AuthenticatedUser, CurrentUser, JwtAuthGuard, Roles, RolesGuard } from '@/auth';
import { ProductStatus } from '@/entities/product.entity';
import { UserRole } from '@/entities/user.entity';
import { ListProductsQueryDto } from './list-products.query.dto';

@ApiTags('Products')
@Controller('products')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ProductsController {
    constructor(private readonly svc: ProductsService) {}

    @Get()
    @Roles(
        UserRole.ADMIN,
        UserRole.MANAGER,
        UserRole.TEAM_LEADER,
        UserRole.OPERATIONS_MANAGER,
        UserRole.CHIEF_EXECUTIVE_OFFICER,
        UserRole.VIEWER
    )
    @ApiOperation({ summary: 'List products' })
    @ApiQuery({ name: 'page', required: false, type: Number })
    @ApiQuery({ name: 'limit', required: false, type: Number })
    @ApiQuery({ name: 'search', required: false, type: String })
    @ApiQuery({ name: 'category', required: false, enum: Object.values(ProductStatus) })
    @ApiQuery({ name: 'status', required: false, enum: Object.values(ProductStatus) })
    async list(@Query() q: ListProductsQueryDto) {
        // Convert category and status from string to enum if present
        const query: ProductListQuery = {
            ...q,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            category: q.category ? (ProductStatus as any)[q.category] : undefined,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            status: q.status ? (ProductStatus as any)[q.status] : undefined,
        };
        const res = await this.svc.list(query);
        return {
            success: true,
            data: res,
            meta: { timestamp: new Date().toISOString(), version: '1.0.0' },
        };
    }

    @Get(':id')
    @Roles(
        UserRole.ADMIN,
        UserRole.MANAGER,
        UserRole.TEAM_LEADER,
        UserRole.OPERATIONS_MANAGER,
        UserRole.CHIEF_EXECUTIVE_OFFICER,
        UserRole.VIEWER
    )
    @ApiOperation({ summary: 'Get product by id' })
    @ApiParam({ name: 'id', description: 'UUID' })
    async get(@Param('id', ParseUUIDPipe) id: string) {
        const row = await this.svc.get(id);
        return {
            success: true,
            data: row,
            meta: { timestamp: new Date().toISOString(), version: '1.0.0' },
        };
    }

    @Post()
    @Roles(UserRole.ADMIN, UserRole.MANAGER)
    @ApiOperation({ summary: 'Create product' })
    async create(@Body() dto: CreateProductDto, @CurrentUser() user: AuthenticatedUser) {
        const row = await this.svc.create(dto, user);
        return {
            success: true,
            data: row,
            meta: { timestamp: new Date().toISOString(), version: '1.0.0' },
        };
    }

    @Put(':id')
    @Roles(UserRole.ADMIN, UserRole.MANAGER)
    @ApiOperation({ summary: 'Update product' })
    async update(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: UpdateProductDto,
        @CurrentUser() user: AuthenticatedUser
    ) {
        const row = await this.svc.update(id, dto, user);
        return {
            success: true,
            data: row,
            meta: { timestamp: new Date().toISOString(), version: '1.0.0' },
        };
    }

    @Delete(':id')
    @Roles(UserRole.ADMIN, UserRole.MANAGER)
    @ApiOperation({ summary: 'Delete (soft) product' })
    async remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthenticatedUser) {
        await this.svc.delete(id, user);
        return {
            success: true,
            data: { message: 'Deleted' },
            meta: { timestamp: new Date().toISOString(), version: '1.0.0' },
        };
    }

    @Put(':id/status/:status')
    @Roles(UserRole.ADMIN, UserRole.MANAGER)
    @ApiOperation({ summary: 'Set product status' })
    async setStatus(
        @Param('id', ParseUUIDPipe) id: string,
        @Param('status') status: ProductStatus,
        @CurrentUser() user: AuthenticatedUser
    ) {
        const row = await this.svc.setStatus(id, status, user);
        return {
            success: true,
            data: row,
            meta: { timestamp: new Date().toISOString(), version: '1.0.0' },
        };
    }
}
