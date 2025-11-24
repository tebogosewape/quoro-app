import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.development' });

const dataSource = new DataSource({
    type: 'mysql',
    host: process.env.DB_HOST || 'mysql-dev',
    port: parseInt(process.env.DB_PORT || '3306'),
    username: process.env.DB_USERNAME || 'devuser',
    password: process.env.DB_PASSWORD || 'devpassword',
    database: process.env.DB_NAME || 'quora-app',
});

async function checkLatestClients() {
    try {
        await dataSource.initialize();
        console.log('📊 Checking latest clients...\n');

        const result = await dataSource.query(`
            SELECT
                id,
                first_name,
                last_name,
                file_reference,
                status,
                created_at
            FROM clients
            ORDER BY created_at DESC
            LIMIT 5
        `);

        console.log('Latest 5 clients:');
        result.forEach((client: Record<string, unknown>, index: number) => {
            console.log(
                `\n${index + 1}. ${client.file_reference} - ${client.first_name} ${client.last_name}`
            );
            console.log(`   Status: ${client.status}`);
            console.log(`   Created: ${client.created_at}`);
        });

        await dataSource.destroy();
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

checkLatestClients();
