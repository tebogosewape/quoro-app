import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';
import { Task } from '@/entities/task.entity';
import { Lead } from '@/entities/lead.entity';

@Module({
    imports: [TypeOrmModule.forFeature([Task, Lead])],
    controllers: [TasksController],
    providers: [TasksService],
    exports: [TasksService],
})
export class TasksModule {}
