import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../entities/user.entity';
import { Lead } from '../entities/lead.entity';
import { Client } from '../entities/client.entity';
import { UsersService } from './users.service';
import { UsersController, PublicUsersController } from './users.controller';
import { AuditModule } from '../modules/audit/audit.module';

@Module({
    imports: [TypeOrmModule.forFeature([User, Lead, Client]), AuditModule],
    controllers: [UsersController, PublicUsersController],
    providers: [UsersService],
    exports: [UsersService],
})
export class UsersModule {}
