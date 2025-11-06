import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AppService } from './app.service';

@ApiTags('health')
@Controller()
export class AppController {
    constructor(private readonly appService: AppService) {}

    @Get()
    @ApiOperation({ summary: 'Health check endpoint' })
    @ApiResponse({
        status: 200,
        description: 'API is healthy',
        schema: {
            type: 'object',
            properties: {
                status: { type: 'string', example: 'ok' },
                timestamp: { type: 'string', example: '2024-01-08T10:00:00.000Z' },
                version: { type: 'string', example: '1.0.0' },
                environment: { type: 'string', example: 'development' },
            },
        },
    })
    getHealthCheck() {
        return this.appService.getHealthCheck();
    }

    @Get('health')
    @ApiOperation({ summary: 'Detailed health check with dependencies' })
    @ApiResponse({
        status: 200,
        description: 'Detailed health status',
        schema: {
            type: 'object',
            properties: {
                status: { type: 'string', example: 'ok' },
                timestamp: { type: 'string', example: '2024-01-08T10:00:00.000Z' },
                version: { type: 'string', example: '1.0.0' },
                environment: { type: 'string', example: 'development' },
                database: { type: 'string', example: 'connected' },
                uptime: { type: 'number', example: 123.456 },
            },
        },
    })
    getDetailedHealthCheck() {
        return this.appService.getDetailedHealthCheck();
    }
}
