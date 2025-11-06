import { AppDataSource } from './database/data-source';

async function runMigrations() {
    try {
        await AppDataSource.initialize();
        console.log('✅ Database connected');

        await AppDataSource.runMigrations();
        console.log('✅ Migrations completed successfully');

        await AppDataSource.destroy();
        console.log('🔌 Database connection closed');
    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    }
}

if (require.main === module) {
    runMigrations();
}
