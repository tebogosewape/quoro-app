import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Client } from '@/entities/client.entity';
import { Lead } from '@/entities/lead.entity';
import { Task } from '@/entities/task.entity';
import { User } from '@/entities/user.entity';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';

@Module({
    imports: [TypeOrmModule.forFeature([Client, Lead, Task, User])],
    controllers: [DashboardController],
    providers: [DashboardService],
})
export class DashboardModule {}
