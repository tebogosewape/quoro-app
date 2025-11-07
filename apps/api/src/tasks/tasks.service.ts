/* eslint-disable indent */
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Task } from '@/entities/task.entity';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';

@Injectable()
export class TasksService {
    constructor(@InjectRepository(Task) private readonly repo: Repository<Task>) {}

    async create(createDto: CreateTaskDto, createdByUserId: string): Promise<Task> {
        const task = this.repo.create({
            ...createDto,
            createdByUserId,
            status: createDto.status || 'pending',
            priority: createDto.priority || 'normal',
        });
        return this.repo.save(task);
    }

    async findAll(query?: {
        clientId?: string;
        assignedToUserId?: string;
        page?: number;
        limit?: number;
    }) {
        const page = query?.page || 1;
        const limit = query?.limit || 20;
        const skip = (page - 1) * limit;

        const qb = this.repo
            .createQueryBuilder('task')
            .leftJoinAndSelect('task.assignedToUser', 'assignedToUser')
            .leftJoinAndSelect('task.client', 'client')
            .leftJoinAndSelect('task.createdByUser', 'createdByUser')
            .orderBy('task.createdAt', 'DESC')
            .skip(skip)
            .take(limit);

        if (query?.clientId) {
            qb.andWhere('task.clientId = :clientId', { clientId: query.clientId });
        }

        if (query?.assignedToUserId) {
            qb.andWhere('task.assignedToUserId = :assignedToUserId', {
                assignedToUserId: query.assignedToUserId,
            });
        }

        const [tasks, total] = await qb.getManyAndCount();

        return {
            tasks,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };
    }

    async findOne(id: string): Promise<Task> {
        const task = await this.repo.findOne({
            where: { id },
            relations: ['assignedToUser', 'client', 'createdByUser'],
        });

        if (!task) {
            throw new NotFoundException(`Task with ID ${id} not found`);
        }

        return task;
    }

    async update(id: string, updateDto: UpdateTaskDto): Promise<Task> {
        const task = await this.findOne(id);
        Object.assign(task, updateDto);
        return this.repo.save(task);
    }

    async remove(id: string): Promise<void> {
        const task = await this.findOne(id);
        await this.repo.remove(task);
    }
}
