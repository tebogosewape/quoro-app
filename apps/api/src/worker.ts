import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
    const appContext = await NestFactory.createApplicationContext(AppModule, {
        logger: ['error', 'warn', 'log'],
    });

    const logger = new Logger('EmailWorker');
    logger.log('📨 Email worker started and listening for jobs...');

    const shutdown = async (signal?: string) => {
        logger.log(`Shutting down email worker${signal ? ` due to ${signal}` : ''}`);
        await appContext.close();
        process.exit(0);
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
}

bootstrap().catch((error) => {
    // eslint-disable-next-line no-console
    console.error('Email worker failed to start:', error);
    process.exit(1);
});
