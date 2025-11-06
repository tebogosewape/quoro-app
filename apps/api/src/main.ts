import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';

async function bootstrap() {
    const app = await NestFactory.create<NestExpressApplication>(AppModule, {
        logger: ['error', 'warn', 'log', 'debug', 'verbose'],
    });

    const configService = app.get(ConfigService);
    const logger = new Logger('Bootstrap');

    // Security middleware
    app.use(
        helmet({
            contentSecurityPolicy: {
                directives: {
                    defaultSrc: ["'self'"],
                    styleSrc: ["'self'", "'unsafe-inline'"],
                    scriptSrc: ["'self'"],
                    imgSrc: ["'self'", 'data:', 'https:'],
                },
            },
            crossOriginEmbedderPolicy: false,
        })
    );

    // CORS configuration (support multiple origins)
    const corsOrigins = (configService.get<string>('CORS_ORIGIN', 'http://localhost:2100') || '')
        .split(',')
        .map((o) => o.trim().replace(/\/$/, '').toLowerCase())
        .filter(Boolean);
    app.enableCors({
        origin: (origin, callback) => {
            const reqOrigin = (origin || '').replace(/\/$/, '').toLowerCase();
            // Debug log
            // eslint-disable-next-line no-console
            console.log('[CORS] Request origin:', reqOrigin, '| Allowed:', corsOrigins);
            if (!origin) return callback(null, true);
            if (corsOrigins.includes(reqOrigin)) {
                return callback(null, true);
            }
            return callback(new Error('Not allowed by CORS'), false);
        },
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-Trace-Id'],
        credentials: true,
        maxAge: 86400, // 24 hours
    });

    // Global prefix
    app.setGlobalPrefix('api', {
        exclude: ['/health', '/'],
    });

    // Global validation pipe
    app.useGlobalPipes(
        new ValidationPipe({
            whitelist: true,
            forbidNonWhitelisted: true,
            transform: true,

            transformOptions: {
                enableImplicitConversion: true,
            },
            forbidUnknownValues: true,
            disableErrorMessages: configService.get('NODE_ENV') === 'production',

            validationError: {
                target: false,
                value: false,
            },
        })
    );

    // Global filters and interceptors
    app.useGlobalFilters(new HttpExceptionFilter());
    app.useGlobalInterceptors(new LoggingInterceptor(), new TransformInterceptor());

    // Swagger documentation (only in development)
    if (configService.get('NODE_ENV') !== 'production') {
        const config = new DocumentBuilder()
            .setTitle('Quora Financial API')
            .setDescription('Financial services debt review platform API')
            .setVersion('1.0')
            .addBearerAuth(
                {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                    name: 'JWT',
                    description: 'Enter JWT token',
                    in: 'header',
                },
                'JWT-auth'
            )
            .build();

        const document = SwaggerModule.createDocument(app, config);
        SwaggerModule.setup('api/docs', app, document, {
            swaggerOptions: {
                persistAuthorization: true,
            },
        });
    }

    // Start server
    const port = configService.get('PORT', 2200);
    await app.listen(port);

    logger.log(`🚀 Application is running on: http://localhost:${port}/api`);
    if (configService.get('NODE_ENV') !== 'production') {
        logger.log(`📚 Swagger docs available at: http://localhost:${port}/api/docs`);
    }
}

bootstrap().catch((error) => {
    console.error('Failed to start application:', error);
    process.exit(1);
});
