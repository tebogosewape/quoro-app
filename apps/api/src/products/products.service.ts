import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere } from 'typeorm';
import {
    CreateProductDto,
    UpdateProductDto,
    ProductListQuery,
    ProductListResponse,
} from './products.dto';
import { Product } from '@/entities/product.entity';
import { AuthenticatedUser } from '@/auth/auth.types';

@Injectable()
export class ProductsService {
    constructor(
        @InjectRepository(Product)
        private repo: Repository<Product>
    ) {}

    async create(dto: CreateProductDto, actor: AuthenticatedUser): Promise<Product> {
        // unique code guard
        const existing = await this.repo.findOne({ where: { code: dto.code } });
        if (existing) throw new ConflictException('A product with this code already exists');

        const entity = this.repo.create({
            ...dto,
            createdBy: actor.id,
            updatedBy: actor.id,
        });
        const saved = await this.repo.save(entity);
        return saved;
    }

    async list(query: ProductListQuery): Promise<ProductListResponse> {
        const { page = 1, limit = 10, search, category, status } = query;
        const skip = (page - 1) * limit;
        const where: FindOptionsWhere<Product> = {};

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if (category) (where as any).category = category;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if (status) (where as any).status = status;

        const qb = this.repo
            .createQueryBuilder('p')
            .where(where)
            .andWhere('p.deletedAt IS NULL')
            .orderBy('p.createdAt', 'DESC')
            .skip(skip)
            .take(limit);

        if (search) {
            qb.andWhere('(p.code LIKE :q OR p.name LIKE :q OR p.description LIKE :q)', {
                q: `%${search}%`,
            });
        }

        const [rows, total] = await qb.getManyAndCount();

        return {
            products: rows,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };
    }

    async get(id: string): Promise<Product> {
        const found = await this.repo.findOne({ where: { id } });
        if (!found) throw new NotFoundException('Product not found');
        return found;
    }

    async update(id: string, dto: UpdateProductDto, actor: AuthenticatedUser): Promise<Product> {
        const found = await this.repo.findOne({ where: { id } });
        if (!found) throw new NotFoundException('Product not found');

        if (dto.code && dto.code !== found.code) {
            const clash = await this.repo.findOne({ where: { code: dto.code } });
            if (clash) throw new ConflictException('A product with this code already exists');
        }

        Object.assign(found, dto);
        found.updatedBy = actor.id;
        const saved = await this.repo.save(found);
        return saved;
    }

    async delete(id: string, actor: AuthenticatedUser): Promise<void> {
        const found = await this.repo.findOne({ where: { id } });
        if (!found) throw new NotFoundException('Product not found');
        found.deletedAt = new Date();
        found.updatedBy = actor.id;
        await this.repo.save(found);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async setStatus(id: string, status: any, actor: AuthenticatedUser): Promise<Product> {
        const found = await this.repo.findOne({ where: { id } });
        if (!found) throw new NotFoundException('Product not found');
        found.status = status;
        found.updatedBy = actor.id;
        return this.repo.save(found);
    }
}
