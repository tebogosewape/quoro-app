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

async function runMigration() {
    try {
        await dataSource.initialize();
        console.log('🚀 Starting lead client_id migration...\n');

        const queryRunner = dataSource.createQueryRunner();
        await queryRunner.connect();

        console.log('✅ Database connection established\n');

        // Step 1: Check if column exists
        console.log('📋 Step 1: Checking if client_id column exists...');
        const columnCheck = await queryRunner.query(`
            SELECT COUNT(*) as count
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE()
            AND TABLE_NAME = 'leads'
            AND COLUMN_NAME = 'client_id'
        `);

        const columnExists = columnCheck[0].count > 0;

        if (!columnExists) {
            console.log('   ➕ Adding client_id column...');
            await queryRunner.query(`
                ALTER TABLE \`leads\`
                ADD COLUMN \`client_id\` VARCHAR(36) NULL
                COMMENT 'Reference to client if lead was converted'
            `);
            console.log('   ✅ Column added successfully');
        } else {
            console.log('   ℹ️  Column already exists');
        }

        // Step 2: Add index on client_id
        console.log('\n📋 Step 2: Checking for index on client_id...');
        const clientIdIndexCheck = await queryRunner.query(`
            SELECT COUNT(*) as count
            FROM INFORMATION_SCHEMA.STATISTICS
            WHERE TABLE_SCHEMA = DATABASE()
            AND TABLE_NAME = 'leads'
            AND INDEX_NAME = 'IDX_lead_client'
        `);

        if (clientIdIndexCheck[0].count === 0) {
            console.log('   ➕ Adding index on client_id...');
            await queryRunner.query(`
                ALTER TABLE \`leads\`
                ADD INDEX \`IDX_lead_client\` (\`client_id\`)
            `);
            console.log('   ✅ Index added successfully');
        } else {
            console.log('   ℹ️  Index already exists');
        }

        // Step 3: Add index on leadOutcome
        console.log('\n📋 Step 3: Checking for index on leadOutcome...');
        const outcomeIndexCheck = await queryRunner.query(`
            SELECT COUNT(*) as count
            FROM INFORMATION_SCHEMA.STATISTICS
            WHERE TABLE_SCHEMA = DATABASE()
            AND TABLE_NAME = 'leads'
            AND INDEX_NAME = 'IDX_lead_outcome'
        `);

        if (outcomeIndexCheck[0].count === 0) {
            console.log('   ➕ Adding index on leadOutcome...');
            await queryRunner.query(`
                ALTER TABLE \`leads\`
                ADD INDEX \`IDX_lead_outcome\` (\`leadOutcome\`)
            `);
            console.log('   ✅ Index added successfully');
        } else {
            console.log('   ℹ️  Index already exists');
        }

        // Step 4: Show summary
        console.log('\n📊 Summary:');
        const leadStats = await queryRunner.query(`
            SELECT
                COUNT(*) as total,
                COUNT(\`client_id\`) as converted,
                COUNT(*) - COUNT(\`client_id\`) as not_converted
            FROM \`leads\`
        `);

        console.log(`   Total leads: ${leadStats[0].total}`);
        console.log(`   Converted (with client_id): ${leadStats[0].converted}`);
        console.log(`   Not converted: ${leadStats[0].not_converted}`);

        await queryRunner.release();
        console.log('\n✅ Migration completed successfully!\n');

        await dataSource.destroy();
        console.log('🔌 Database connection closed\n');
    } catch (error) {
        console.error('❌ Migration failed:', error);
        await dataSource.destroy();
        throw error;
    }
}

// Run the migration
runMigration()
    .then(() => {
        console.log('✨ All done!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n💥 Migration failed:', error);
        process.exit(1);
    });
