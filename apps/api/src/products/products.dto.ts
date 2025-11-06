/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable indent */
import { ProductCategory, ProductStatus } from '@/entities/product.entity';
import { IsBoolean, IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateProductDto {
    @IsString()
    @IsNotEmpty()
    @MaxLength(100)
    code!: string;

    @IsString()
    @IsNotEmpty()
    @MaxLength(200)
    name!: string;

    @IsEnum(ProductCategory)
    category!: ProductCategory;

    @IsEnum(ProductStatus)
    status!: ProductStatus;

    @IsBoolean()
    requires_mandate!: boolean;

    @IsBoolean()
    requires_credit_pull!: boolean;

    @IsOptional() pricing_options?: unknown;
    @IsOptional() agent_commission_rules?: unknown;
    @IsOptional() capture_restrictions?: unknown;
    @IsOptional() fee_structure?: unknown;
    @IsOptional() status_flags?: unknown;

    @IsOptional()
    @IsString()
    description?: string;
}

export class UpdateProductDto {
    @IsOptional()
    @IsString()
    @MaxLength(100)
    code?: string;

    @IsOptional()
    @IsString()
    @MaxLength(200)
    name?: string;

    @IsOptional()
    @IsEnum(ProductCategory)
    category?: ProductCategory;

    @IsOptional()
    @IsEnum(ProductStatus)
    status?: ProductStatus;

    @IsOptional()
    @IsBoolean()
    requires_mandate?: boolean;

    @IsOptional()
    @IsBoolean()
    requires_credit_pull?: boolean;

    @IsOptional() pricing_options?: unknown;
    @IsOptional() agent_commission_rules?: unknown;
    @IsOptional() capture_restrictions?: unknown;
    @IsOptional() fee_structure?: unknown;
    @IsOptional() status_flags?: unknown;

    @IsOptional()
    @IsString()
    description?: string;
}

export class ProductListQuery {
    page?: number;
    limit?: number;
    search?: string; // code/name/description
    category?: ProductCategory;
    status?: ProductStatus; // active/inactive/archived
}

export type ProductListResponse = {
    products: any[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
};
