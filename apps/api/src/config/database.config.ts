import { registerAs } from '@nestjs/config';

export const DatabaseConfig = registerAs('database', () => {
    const mysqlDatabaseName = process.env.DB_NAME || process.env.DB_DATABASE || 'quora_app';

    return {
        synchronize: process.env.NODE_ENV === 'development',
        logging: process.env.NODE_ENV === 'development' ? 'all' : ['error'],
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
        type: 'mysql' as const,
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '3306', 10),
        username: process.env.DB_USERNAME || 'root',
        password: process.env.DB_PASSWORD || '',
        database: mysqlDatabaseName,
        charset: 'utf8mb4',
        timezone: '+00:00',
        extra: {
            connectionLimit: 10,
            waitForConnections: true,
            connectTimeout: 60000,
        },
    };
});
