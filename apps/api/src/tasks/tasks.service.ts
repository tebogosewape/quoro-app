/* eslint-disable indent */
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Task } from '@/entities/task.entity';
import { Lead } from '@/entities/lead.entity';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';

@Injectable()
export class TasksService {
    constructor(
        @InjectRepository(Task) private readonly repo: Repository<Task>,
        @InjectRepository(Lead) private readonly leadRepo: Repository<Lead>
    ) {}

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

        const [tasks] = await qb.getManyAndCount();

        // Filter out tasks where the lead has been converted to a client
        // This prevents agents from seeing leads that are already converted on their dashboard
        const filteredTasks = await Promise.all(
            tasks.map(async (task) => {
                // Check if this task has a leadId in metadata
                if (
                    task.metadata &&
                    typeof task.metadata === 'object' &&
                    'leadId' in task.metadata
                ) {
                    const leadId = (task.metadata as { leadId?: string }).leadId;
                    if (leadId) {
                        // Check if the lead has been converted
                        const lead = await this.leadRepo.findOne({
                            where: { id: leadId },
                            select: ['id', 'leadOutcome', 'clientId'],
                        });

                        // If lead is converted, exclude this task from results
                        if (lead && lead.leadOutcome === 'Converted') {
                            return null;
                        }
                    }
                }
                return task;
            })
        );

        // Remove null entries (converted leads)
        const activeTasks = filteredTasks.filter((task) => task !== null) as Task[];

        return {
            tasks: activeTasks,
            total: activeTasks.length, // Update total to reflect filtered count
            page,
            limit,
            totalPages: Math.ceil(activeTasks.length / limit),
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
