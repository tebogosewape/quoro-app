import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Client } from '../entities/client.entity';
import { DebicheckService } from './debicheck.service';
import { DebicheckController } from './debicheck.controller';

@Module({
    imports: [ConfigModule, TypeOrmModule.forFeature([Client])],
    controllers: [DebicheckController],
    providers: [DebicheckService],
    exports: [DebicheckService],
})
export class DebicheckModule {}
