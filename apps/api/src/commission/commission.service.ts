import { CommissionSetting } from '@/entities/commission-setting.entity';
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

@Injectable()
export class CommissionService {
    private readonly logger = new Logger(CommissionService.name);
    private static readonly SINGLETON_KEY = 'global';

    constructor(
        @InjectRepository(CommissionSetting)
        private readonly repo: Repository<CommissionSetting>
    ) {}

    /**
     * Ensure there is exactly one commission row. If none, create default (10).
     */
    private async ensureSingleton(): Promise<CommissionSetting> {
        let row = await this.repo.findOne({
            where: { singletonKey: CommissionService.SINGLETON_KEY },
        });
        if (!row) {
            this.logger.log('No commission setting found. Creating default (10).');
            row = this.repo.create({
                singletonKey: CommissionService.SINGLETON_KEY,
                percentage: '10.00',
            });
            row = await this.repo.save(row);
        }
        return row;
    }

    async getGlobal(): Promise<number> {
        const row = await this.ensureSingleton();
        return Number(row.percentage);
    }

    async updateGlobal(next: number): Promise<number> {
        const row = await this.ensureSingleton();
        row.percentage = next.toFixed(2);
        await this.repo.save(row);
        return Number(row.percentage);
    }
}
