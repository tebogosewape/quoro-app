import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AppService {
    constructor(private readonly configService: ConfigService) {}

    getHealthCheck() {
        return {
            status: 'ok',
            timestamp: new Date().toISOString(),
            version: process.env.npm_package_version || '1.0.0',
            environment: this.configService.get('NODE_ENV', 'development'),
        };
    }

    getDetailedHealthCheck() {
        const uptime = process.uptime();

        return {
            ...this.getHealthCheck(),
            database: 'connected', // TODO: Add actual database health check
            uptime: uptime,
            memory: {
                used: Math.round((process.memoryUsage().heapUsed / 1024 / 1024) * 100) / 100,
                total: Math.round((process.memoryUsage().heapTotal / 1024 / 1024) * 100) / 100,
            },
            cpu: {
                usage: process.cpuUsage(),
            },
        };
    }
}
