/**
 * Migration script to add file_reference column to clients table
 * Run with: npm run migration:file-reference
 */

import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import { join } from 'path';

// Load environment variables
dotenv.config({ path: join(__dirname, '../.env.development') });

async function runMigration() {
    console.log('🚀 Starting file_reference migration...\n');

    const dataSource = new DataSource({
        type: 'mysql',
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '3306'),
        username: process.env.DB_USERNAME,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
    });

    try {
        await dataSource.initialize();
        console.log('✅ Database connection established\n');

        const queryRunner = dataSource.createQueryRunner();

        // Step 1: Check if column exists
        console.log('📋 Step 1: Checking if file_reference column exists...');
        const columnCheck = await queryRunner.query(
            `
            SELECT COUNT(*) as count FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'clients' AND COLUMN_NAME = 'file_reference'
        `,
            [process.env.DB_NAME]
        );

        const columnExists = columnCheck[0].count > 0;

        if (!columnExists) {
            console.log('   ➕ Adding file_reference column...');
            await queryRunner.query(`
                ALTER TABLE \`clients\`
                ADD COLUMN \`file_reference\` VARCHAR(20) NULL AFTER \`id\`
            `);
            console.log('   ✅ Column added successfully\n');
        } else {
            console.log('   ℹ️  Column already exists\n');
        }

        // Step 2: Drop existing index if it exists
        console.log('📋 Step 2: Checking for existing index...');
        const indexCheck = await queryRunner.query(
            `
            SELECT COUNT(*) as count FROM INFORMATION_SCHEMA.STATISTICS
            WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'clients' AND INDEX_NAME = 'IDX_file_reference'
        `,
            [process.env.DB_NAME]
        );

        const indexExists = indexCheck[0].count > 0;

        if (indexExists) {
            console.log('   🗑️  Dropping existing index...');
            await queryRunner.query(`
                ALTER TABLE \`clients\` DROP INDEX \`IDX_file_reference\`
            `);
            console.log('   ✅ Index dropped\n');
        } else {
            console.log('   ℹ️  No existing index found\n');
        }

        // Step 3: Update existing clients with file references
        console.log('📋 Step 3: Updating existing clients with file references...');

        // Get all clients without file references
        const clientsToUpdate = await queryRunner.query(`
            SELECT id, created_at
            FROM \`clients\`
            WHERE \`file_reference\` IS NULL OR \`file_reference\` = ''
            ORDER BY \`created_at\` ASC
        `);

        if (clientsToUpdate.length > 0) {
            console.log(`   📝 Found ${clientsToUpdate.length} clients to update`);

            // Find the highest existing file reference number
            const lastFileRef = await queryRunner.query(`
                SELECT \`file_reference\`
                FROM \`clients\`
                WHERE \`file_reference\` LIKE 'QFN%'
                ORDER BY \`file_reference\` DESC
                LIMIT 1
            `);

            let nextNumber = 1;
            if (lastFileRef.length > 0 && lastFileRef[0].file_reference) {
                const match = lastFileRef[0].file_reference.match(/QFN(\d+)/);
                if (match) {
                    nextNumber = parseInt(match[1], 10) + 1;
                }
            }

            console.log(`   🔢 Starting from QFN${String(nextNumber).padStart(6, '0')}`);

            // Update each client
            for (const client of clientsToUpdate) {
                const fileRef = `QFN${String(nextNumber).padStart(6, '0')}`;
                await queryRunner.query(
                    `UPDATE \`clients\` SET \`file_reference\` = ? WHERE \`id\` = ?`,
                    [fileRef, client.id]
                );
                nextNumber++;
            }

            console.log(`   ✅ Updated ${clientsToUpdate.length} clients\n`);
        } else {
            console.log('   ℹ️  All clients already have file references\n');
        }

        // Step 4: Add unique index
        console.log('📋 Step 4: Adding unique index on file_reference...');
        await queryRunner.query(`
            ALTER TABLE \`clients\`
            ADD UNIQUE INDEX \`IDX_file_reference\` (\`file_reference\`)
        `);
        console.log('   ✅ Index created successfully\n');

        // Show summary before releasing
        const summary = await queryRunner.query(`
            SELECT COUNT(*) as total,
                   COUNT(\`file_reference\`) as with_ref
            FROM \`clients\`
        `);

        await queryRunner.release();
        console.log('✅ Migration completed successfully!\n');

        console.log('📊 Summary:');
        console.log(`   Total clients: ${summary[0].total}`);
        console.log(`   With file references: ${summary[0].with_ref}`);
    } catch (error) {
        console.error('❌ Migration failed:', error);
        throw error;
    } finally {
        await dataSource.destroy();
        console.log('\n🔌 Database connection closed');
    }
}

// Run the migration
runMigration()
    .then(() => {
        console.log('\n✨ All done!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n💥 Migration failed:', error);
        process.exit(1);
    });
