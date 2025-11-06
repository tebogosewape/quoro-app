import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Permission } from '@/entities/permissions.entity';

@Injectable()
export class PermissionsService {
    constructor(@InjectRepository(Permission) private readonly repo: Repository<Permission>) {}

    findAll() {
        return this.repo.find({ order: { key: 'ASC' } });
    }
}
