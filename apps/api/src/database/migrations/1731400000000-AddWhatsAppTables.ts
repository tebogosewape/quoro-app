import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddWhatsAppTables1731400000000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        // Create whatsapp_sessions table
        await queryRunner.query(`
            CREATE TABLE \`whatsapp_sessions\` (
                \`id\` varchar(36) NOT NULL,
                \`created_at\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
                \`updated_at\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                \`deleted_at\` datetime NULL,
                \`created_by\` varchar(36) NULL,
                \`updated_by\` varchar(36) NULL,
                \`version\` int NOT NULL DEFAULT 1,
                \`session_name\` varchar(100) NOT NULL,
                \`status\` varchar(20) NOT NULL DEFAULT 'disconnected',
                \`phone_number\` varchar(20) NULL,
                \`qr_code\` text NULL,
                \`last_connected_at\` datetime NULL,
                \`last_disconnected_at\` datetime NULL,
                \`error_message\` text NULL,
                \`metadata\` json NULL,
                PRIMARY KEY (\`id\`),
                UNIQUE KEY \`UQ_whatsapp_sessions_session_name\` (\`session_name\`),
                INDEX \`IDX_whatsapp_sessions_status\` (\`status\`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);

        // Create whatsapp_messages table
        await queryRunner.query(`
            CREATE TABLE \`whatsapp_messages\` (
                \`id\` varchar(36) NOT NULL,
                \`created_at\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
                \`updated_at\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                \`deleted_at\` datetime NULL,
                \`created_by\` varchar(36) NULL,
                \`updated_by\` varchar(36) NULL,
                \`version\` int NOT NULL DEFAULT 1,
                \`client_id\` varchar(36) NOT NULL,
                \`user_id\` varchar(36) NULL,
                \`direction\` varchar(20) NOT NULL DEFAULT 'outbound',
                \`status\` varchar(20) NOT NULL DEFAULT 'pending',
                \`from_number\` varchar(20) NOT NULL,
                \`to_number\` varchar(20) NOT NULL,
                \`message\` text NULL,
                \`media_url\` varchar(255) NULL,
                \`media_mime_type\` varchar(100) NULL,
                \`media_filename\` varchar(255) NULL,
                \`whatsapp_message_id\` varchar(255) NULL,
                \`sent_at\` datetime NULL,
                \`delivered_at\` datetime NULL,
                \`read_at\` datetime NULL,
                \`error_message\` text NULL,
                \`metadata\` json NULL,
                PRIMARY KEY (\`id\`),
                INDEX \`IDX_whatsapp_messages_client_id\` (\`client_id\`),
                INDEX \`IDX_whatsapp_messages_status\` (\`status\`),
                INDEX \`IDX_whatsapp_messages_created_at\` (\`created_at\`),
                CONSTRAINT \`FK_whatsapp_messages_client\` FOREIGN KEY (\`client_id\`) REFERENCES \`clients\` (\`id\`) ON DELETE CASCADE ON UPDATE CASCADE,
                CONSTRAINT \`FK_whatsapp_messages_user\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\` (\`id\`) ON DELETE SET NULL ON UPDATE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('DROP TABLE `whatsapp_messages`');
        await queryRunner.query('DROP TABLE `whatsapp_sessions`');
    }
}
