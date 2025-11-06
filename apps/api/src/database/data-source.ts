import { DataSource, DataSourceOptions } from 'typeorm';
import { config } from 'dotenv';
import { existsSync } from 'fs';
import { resolve } from 'path';
import { User } from '../entities/user.entity';
import { AuditLog } from '../entities/audit-log.entity';

// Load environment variables
const envCandidates = [
    process.env.ENV_FILE,
    `.env.${process.env.NODE_ENV ?? 'development'}`,
    '.env',
].filter(Boolean) as string[];

for (const candidate of envCandidates) {
    const envPath = resolve(__dirname, '../../', candidate);
    if (existsSync(envPath)) {
        config({ path: envPath });
    }
}

const isProduction = process.env.NODE_ENV === 'production';
const mysqlDatabaseName = process.env.DB_NAME || process.env.DB_DATABASE || 'quora_app';

const dataSourceConfig: DataSourceOptions = {
    type: 'mysql',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    username: process.env.DB_USERNAME || 'root',
    password: process.env.DB_PASSWORD || '',
    database: mysqlDatabaseName,
    charset: 'utf8mb4',
    timezone: '+00:00',
    ssl: isProduction ? { rejectUnauthorized: false } : false,
    extra: {
        connectionLimit: 10,
        waitForConnections: true,
        connectTimeout: 60000,
    },
    entities: [User, AuditLog],
    migrations: [__dirname + '/migrations/*{.ts,.js}'],
    subscribers: [__dirname + '/subscribers/*{.ts,.js}'],
    synchronize: false, // Always false for migrations
    logging: process.env.NODE_ENV === 'development' ? 'all' : ['error'],
    migrationsRun: false,
    migrationsTableName: 'migrations',
};

export const AppDataSource = new DataSource(dataSourceConfig);
