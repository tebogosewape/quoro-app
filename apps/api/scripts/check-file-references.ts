/* eslint-disable @typescript-eslint/no-explicit-any */
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

async function checkReferences() {
    try {
        await dataSource.initialize();
        console.log('📊 Checking file references in database...\n');

        const result = await dataSource.query(`
            SELECT id, first_name, last_name, file_reference, created_at
            FROM clients
            ORDER BY file_reference
            LIMIT 10
        `);

        console.log('First 10 clients with file references:');
        result.forEach((client: any) => {
            console.log(
                `  ${client.file_reference} - ${client.first_name} ${client.last_name} (ID: ${client.id})`
            );
        });

        const summary = await dataSource.query(`
            SELECT
                COUNT(*) as total,
                COUNT(file_reference) as with_ref,
                COUNT(*) - COUNT(file_reference) as without_ref
            FROM clients
        `);

        console.log('\n📈 Summary:');
        console.log(`  Total clients: ${summary[0].total}`);
        console.log(`  With file reference: ${summary[0].with_ref}`);
        console.log(`  Without file reference: ${summary[0].without_ref}`);

        await dataSource.destroy();
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

checkReferences();
