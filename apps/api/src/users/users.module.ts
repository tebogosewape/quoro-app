import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../entities/user.entity';
import { UsersService } from './users.service';
import { UsersController, PublicUsersController } from './users.controller';
import { AuditModule } from '../modules/audit/audit.module';

@Module({
    imports: [TypeOrmModule.forFeature([User]), AuditModule],
    controllers: [UsersController, PublicUsersController],
    providers: [UsersService],
    exports: [UsersService],
})
export class UsersModule {}
