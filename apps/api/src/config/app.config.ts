import { registerAs } from '@nestjs/config';

export const AppConfig = registerAs('app', () => ({
    name: process.env.APP_NAME || 'Quora Financial API',
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    port: parseInt(process.env.PORT || '2200', 10),
    corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:2100',
    webAppUrl: process.env.WEB_APP_URL || 'http://localhost:2100',
    globalPrefix: 'api',
    swagger: {
        enabled: process.env.NODE_ENV !== 'production',
        path: 'api/docs',
        title: 'Quora Financial API',
        description: 'Financial services debt review platform API',
        version: '1.0',
    },
    logging: {
        level: process.env.LOG_LEVEL || 'debug',
        format: process.env.LOG_FORMAT || 'combined',
    },
    security: {
        bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS || '10', 10),
        sessionSecret: process.env.SESSION_SECRET || 'dev-session-secret',
    },
    rateLimit: {
        windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10),
        maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
    },
}));
