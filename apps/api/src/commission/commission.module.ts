import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CommissionService } from './commission.service';
import { CommissionController } from './commission.controller';
import { CommissionSetting } from '@/entities/commission-setting.entity';

@Module({
    imports: [TypeOrmModule.forFeature([CommissionSetting])],
    controllers: [CommissionController],
    providers: [CommissionService],
    exports: [CommissionService],
})
export class CommissionModule {}
