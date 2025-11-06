import { AppDataSource } from './database/data-source';

async function checkSchema() {
    console.log('🔍 Checking database schema...');

    try {
        if (!AppDataSource.isInitialized) {
            await AppDataSource.initialize();
        }

        // Check users table schema
        const result = await AppDataSource.query(`PRAGMA table_info(users)`);
        console.log('\n📋 Users table schema:');
        console.table(result);

        // Check if users have data
        const users = await AppDataSource.query(
            `SELECT id, email, firstName, lastName, password FROM users LIMIT 2`
        );
        console.log('\n👥 Sample user data:');
        console.table(users);

        await AppDataSource.destroy();
    } catch (error) {
        console.error('❌ Error checking schema:', error);
    }
}

checkSchema();
