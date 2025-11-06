import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddBankingAndProductFieldsToClients1730900000000 implements MigrationInterface {
    name = 'AddBankingAndProductFieldsToClients1730900000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Check and add banking information columns if they don't exist
        const table = await queryRunner.getTable('clients');

        if (!table?.findColumnByName('bank_name')) {
            await queryRunner.query(`
                ALTER TABLE \`clients\`
                ADD COLUMN \`bank_name\` varchar(100) NULL
            `);
        }

        if (!table?.findColumnByName('account_type')) {
            await queryRunner.query(`
                ALTER TABLE \`clients\`
                ADD COLUMN \`account_type\` varchar(50) NULL
            `);
        }

        if (!table?.findColumnByName('account_holder')) {
            await queryRunner.query(`
                ALTER TABLE \`clients\`
                ADD COLUMN \`account_holder\` varchar(100) NULL
            `);
        }

        if (!table?.findColumnByName('account_number')) {
            await queryRunner.query(`
                ALTER TABLE \`clients\`
                ADD COLUMN \`account_number\` varchar(50) NULL
            `);
        }

        if (!table?.findColumnByName('branch_code')) {
            await queryRunner.query(`
                ALTER TABLE \`clients\`
                ADD COLUMN \`branch_code\` varchar(20) NULL
            `);
        }

        // Add product and payment information as JSON columns
        if (!table?.findColumnByName('selected_products')) {
            await queryRunner.query(`
                ALTER TABLE \`clients\`
                ADD COLUMN \`selected_products\` json NULL COMMENT 'Array of selected products with payment options'
            `);
        }

        if (!table?.findColumnByName('payment_info')) {
            await queryRunner.query(`
                ALTER TABLE \`clients\`
                ADD COLUMN \`payment_info\` json NULL COMMENT 'Payment configuration including first payment month and selected payment options'
            `);
        }

        // Add additional personal information fields
        if (!table?.findColumnByName('title')) {
            await queryRunner.query(`
                ALTER TABLE \`clients\`
                ADD COLUMN \`title\` varchar(50) NULL
            `);
        }

        if (!table?.findColumnByName('language')) {
            await queryRunner.query(`
                ALTER TABLE \`clients\`
                ADD COLUMN \`language\` varchar(50) NULL
            `);
        }

        if (!table?.findColumnByName('gender')) {
            await queryRunner.query(`
                ALTER TABLE \`clients\`
                ADD COLUMN \`gender\` varchar(10) NULL
            `);
        }

        // Make assigned_agent_id nullable (since new clients from onboarding may not have an agent assigned yet)
        const agentColumn = table?.findColumnByName('assigned_agent_id');
        if (agentColumn && !agentColumn.isNullable) {
            // Check if foreign key exists before dropping
            const foreignKeys = await queryRunner.query(`
                SELECT CONSTRAINT_NAME
                FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
                WHERE TABLE_SCHEMA = 'quora-app'
                AND TABLE_NAME = 'clients'
                AND CONSTRAINT_NAME = 'FK_clients_assigned_agent'
            `);

            if (foreignKeys.length > 0) {
                // Drop the foreign key constraint temporarily to modify the column
                await queryRunner.query(`
                    ALTER TABLE \`clients\`
                    DROP FOREIGN KEY \`FK_clients_assigned_agent\`
                `);
            }

            await queryRunner.query(`
                ALTER TABLE \`clients\`
                MODIFY COLUMN \`assigned_agent_id\` varchar(36) NULL
            `);

            // Re-add the foreign key constraint
            await queryRunner.query(`
                ALTER TABLE \`clients\`
                ADD CONSTRAINT \`FK_clients_assigned_agent\`
                FOREIGN KEY (\`assigned_agent_id\`) REFERENCES \`users\` (\`id\`)
                ON DELETE SET NULL ON UPDATE CASCADE
            `);
        }

        // Add indexes if they don't exist
        const indices = await queryRunner.query(`
            SHOW INDEX FROM \`clients\` WHERE Key_name = 'IDX_clients_email'
        `);

        if (indices.length === 0) {
            await queryRunner.query(`
                CREATE INDEX \`IDX_clients_email\` ON \`clients\` (\`email\`)
            `);
        }

        const phoneIndices = await queryRunner.query(`
            SHOW INDEX FROM \`clients\` WHERE Key_name = 'IDX_clients_phone_number'
        `);

        if (phoneIndices.length === 0) {
            await queryRunner.query(`
                CREATE INDEX \`IDX_clients_phone_number\` ON \`clients\` (\`phone_number\`)
            `);
        }

        const statusIndices = await queryRunner.query(`
            SHOW INDEX FROM \`clients\` WHERE Key_name = 'IDX_clients_status'
        `);

        if (statusIndices.length === 0) {
            await queryRunner.query(`
                CREATE INDEX \`IDX_clients_status\` ON \`clients\` (\`status\`)
            `);
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Drop indexes
        await queryRunner.query(`DROP INDEX \`IDX_clients_status\` ON \`clients\``);
        await queryRunner.query(`DROP INDEX \`IDX_clients_phone_number\` ON \`clients\``);
        await queryRunner.query(`DROP INDEX \`IDX_clients_email\` ON \`clients\``);

        // Drop foreign key
        await queryRunner.query(`
            ALTER TABLE \`clients\`
            DROP FOREIGN KEY \`FK_clients_assigned_agent\`
        `);

        // Restore original foreign key
        await queryRunner.query(`
            ALTER TABLE \`clients\`
            MODIFY COLUMN \`assigned_agent_id\` varchar(36) NOT NULL
        `);

        await queryRunner.query(`
            ALTER TABLE \`clients\`
            ADD CONSTRAINT \`FK_clients_assigned_agent\`
            FOREIGN KEY (\`assigned_agent_id\`) REFERENCES \`users\` (\`id\`)
            ON DELETE RESTRICT ON UPDATE CASCADE
        `);

        // Drop new columns
        await queryRunner.query(`
            ALTER TABLE \`clients\`
            DROP COLUMN \`gender\`,
            DROP COLUMN \`language\`,
            DROP COLUMN \`title\`,
            DROP COLUMN \`payment_info\`,
            DROP COLUMN \`selected_products\`,
            DROP COLUMN \`branch_code\`,
            DROP COLUMN \`account_number\`,
            DROP COLUMN \`account_holder\`,
            DROP COLUMN \`account_type\`,
            DROP COLUMN \`bank_name\`
        `);
    }
}
