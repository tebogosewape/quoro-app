import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Client } from '@/entities/client.entity';
import { Task } from '@/entities/task.entity';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';

@Module({
    imports: [TypeOrmModule.forFeature([Client, Task])],
    controllers: [DashboardController],
    providers: [DashboardService],
})
export class DashboardModule {}
