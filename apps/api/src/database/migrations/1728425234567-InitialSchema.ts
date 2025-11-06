import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1728425234567 implements MigrationInterface {
    name = 'InitialSchema1728425234567';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE \`users\` (
                \`id\` varchar(36) NOT NULL,
                \`created_at\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
                \`updated_at\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                \`deleted_at\` datetime NULL,
                \`created_by\` varchar(36) NULL,
                \`updated_by\` varchar(36) NULL,
                \`version\` int NOT NULL DEFAULT 1,
                \`firstName\` varchar(100) NOT NULL,
                \`lastName\` varchar(100) NOT NULL,
                \`email\` varchar(255) NOT NULL,
                \`password\` varchar(255) NOT NULL,
                \`employee_number\` varchar(20) NOT NULL,
                \`role\` varchar(50) NOT NULL DEFAULT 'agent',
                \`status\` varchar(50) NOT NULL DEFAULT 'pending',
                \`phone_number\` varchar(20) NULL,
                \`title\` varchar(100) NULL,
                \`department\` varchar(100) NULL,
                \`manager_id\` varchar(36) NULL,
                \`last_login_at\` datetime NULL,
                \`email_verified_at\` datetime NULL,
                \`reset_token\` varchar(255) NULL,
                \`reset_token_expires_at\` datetime NULL,
                \`failed_login_attempts\` int NOT NULL DEFAULT 0,
                \`locked_until\` datetime NULL,
                \`preferences\` longtext,
                PRIMARY KEY (\`id\`),
                UNIQUE KEY \`UQ_users_email\` (\`email\`),
                UNIQUE KEY \`UQ_users_employee_number\` (\`employee_number\`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);

        await queryRunner.query(`
            CREATE TABLE \`clients\` (
                \`id\` varchar(36) NOT NULL,
                \`created_at\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
                \`updated_at\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                \`deleted_at\` datetime NULL,
                \`created_by\` varchar(36) NULL,
                \`updated_by\` varchar(36) NULL,
                \`version\` int NOT NULL DEFAULT 1,
                \`id_number\` varchar(13) NOT NULL,
                \`first_name\` varchar(100) NOT NULL,
                \`last_name\` varchar(100) NOT NULL,
                \`email\` varchar(255) NOT NULL,
                \`phone_number\` varchar(20) NOT NULL,
                \`alternate_phone\` varchar(20) NULL,
                \`date_of_birth\` date NOT NULL,
                \`marital_status\` varchar(20) NOT NULL,
                \`client_type\` varchar(20) NOT NULL DEFAULT 'individual',
                \`status\` varchar(40) NOT NULL DEFAULT 'lead',
                \`assigned_agent_id\` varchar(36) NOT NULL,
                \`physical_address\` longtext,
                \`postal_address\` longtext,
                \`employer\` varchar(100) NULL,
                \`job_title\` varchar(100) NULL,
                \`monthly_income\` decimal(12,2) NULL,
                \`monthly_expenses\` decimal(12,2) NULL,
                \`total_debt\` decimal(12,2) NULL,
                \`credit_score\` int NULL,
                \`consultation_date\` datetime NULL,
                \`application_date\` datetime NULL,
                \`approval_date\` datetime NULL,
                \`rejection_reason\` longtext,
                \`documents_required\` longtext,
                \`documents_received\` longtext,
                \`notes\` longtext,
                \`preferences\` longtext,
                PRIMARY KEY (\`id\`),
                UNIQUE KEY \`UQ_clients_id_number\` (\`id_number\`),
                CONSTRAINT \`FK_clients_assigned_agent\` FOREIGN KEY (\`assigned_agent_id\`) REFERENCES \`users\` (\`id\`) ON DELETE RESTRICT ON UPDATE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);

        await queryRunner.query(`
            CREATE TABLE \`notes\` (
                \`id\` varchar(36) NOT NULL,
                \`created_at\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
                \`updated_at\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                \`deleted_at\` datetime NULL,
                \`created_by\` varchar(36) NULL,
                \`updated_by\` varchar(36) NULL,
                \`version\` int NOT NULL DEFAULT 1,
                \`client_id\` varchar(36) NOT NULL,
                \`created_by_user_id\` varchar(36) NOT NULL,
                \`type\` varchar(50) NOT NULL DEFAULT 'general',
                \`priority\` varchar(20) NOT NULL DEFAULT 'normal',
                \`title\` varchar(255) NOT NULL,
                \`content\` longtext NOT NULL,
                \`is_pinned\` tinyint(1) NOT NULL DEFAULT 0,
                \`is_private\` tinyint(1) NOT NULL DEFAULT 0,
                \`metadata\` longtext,
                \`scheduled_for\` datetime NULL,
                \`tags\` varchar(255) NULL,
                PRIMARY KEY (\`id\`),
                CONSTRAINT \`FK_notes_client\` FOREIGN KEY (\`client_id\`) REFERENCES \`clients\` (\`id\`) ON DELETE CASCADE ON UPDATE CASCADE,
                CONSTRAINT \`FK_notes_created_by_user\` FOREIGN KEY (\`created_by_user_id\`) REFERENCES \`users\` (\`id\`) ON DELETE CASCADE ON UPDATE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);

        await queryRunner.query(`
            CREATE TABLE \`tasks\` (
                \`id\` varchar(36) NOT NULL,
                \`created_at\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
                \`updated_at\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                \`deleted_at\` datetime NULL,
                \`created_by\` varchar(36) NULL,
                \`updated_by\` varchar(36) NULL,
                \`version\` int NOT NULL DEFAULT 1,
                \`client_id\` varchar(36) NOT NULL,
                \`assigned_to_user_id\` varchar(36) NOT NULL,
                \`created_by_user_id\` varchar(36) NULL,
                \`type\` varchar(50) NOT NULL,
                \`status\` varchar(30) NOT NULL DEFAULT 'pending',
                \`priority\` varchar(20) NOT NULL DEFAULT 'normal',
                \`title\` varchar(255) NOT NULL,
                \`description\` longtext,
                \`due_date\` datetime NOT NULL,
                \`started_at\` datetime NULL,
                \`completed_at\` datetime NULL,
                \`estimated_hours\` int NULL,
                \`actual_hours\` int NULL,
                \`completion_notes\` longtext,
                \`metadata\` longtext,
                \`tags\` varchar(255) NULL,
                \`is_recurring\` tinyint(1) NOT NULL DEFAULT 0,
                \`recurrence_pattern\` varchar(50) NULL,
                PRIMARY KEY (\`id\`),
                CONSTRAINT \`FK_tasks_client\` FOREIGN KEY (\`client_id\`) REFERENCES \`clients\` (\`id\`) ON DELETE CASCADE ON UPDATE CASCADE,
                CONSTRAINT \`FK_tasks_assigned_to_user\` FOREIGN KEY (\`assigned_to_user_id\`) REFERENCES \`users\` (\`id\`) ON DELETE CASCADE ON UPDATE CASCADE,
                CONSTRAINT \`FK_tasks_created_by_user\` FOREIGN KEY (\`created_by_user_id\`) REFERENCES \`users\` (\`id\`) ON DELETE SET NULL ON UPDATE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);

        await queryRunner.query(`
            CREATE TABLE \`communications\` (
                \`id\` varchar(36) NOT NULL,
                \`created_at\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
                \`updated_at\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                \`deleted_at\` datetime NULL,
                \`created_by\` varchar(36) NULL,
                \`updated_by\` varchar(36) NULL,
                \`version\` int NOT NULL DEFAULT 1,
                \`client_id\` varchar(36) NOT NULL,
                \`handled_by_user_id\` varchar(36) NULL,
                \`type\` varchar(50) NOT NULL,
                \`direction\` varchar(20) NOT NULL,
                \`status\` varchar(20) NOT NULL DEFAULT 'draft',
                \`subject\` varchar(255) NOT NULL,
                \`content\` longtext NOT NULL,
                \`from_address\` varchar(255) NULL,
                \`to_address\` varchar(255) NULL,
                \`sent_at\` datetime NULL,
                \`delivered_at\` datetime NULL,
                \`read_at\` datetime NULL,
                \`replied_at\` datetime NULL,
                \`thread_id\` varchar(36) NULL,
                \`parent_id\` varchar(36) NULL,
                \`metadata\` longtext,
                \`failure_reason\` longtext,
                \`retry_count\` int NOT NULL DEFAULT 0,
                \`scheduled_for\` datetime NULL,
                \`tags\` varchar(255) NULL,
                \`is_important\` tinyint(1) NOT NULL DEFAULT 0,
                \`is_internal\` tinyint(1) NOT NULL DEFAULT 0,
                PRIMARY KEY (\`id\`),
                CONSTRAINT \`FK_communications_client\` FOREIGN KEY (\`client_id\`) REFERENCES \`clients\` (\`id\`) ON DELETE CASCADE ON UPDATE CASCADE,
                CONSTRAINT \`FK_communications_handled_by_user\` FOREIGN KEY (\`handled_by_user_id\`) REFERENCES \`users\` (\`id\`) ON DELETE SET NULL ON UPDATE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);

        await queryRunner.query('CREATE INDEX `IDX_users_email` ON `users` (`email`)');
        await queryRunner.query(
            'CREATE INDEX `IDX_users_employee_number` ON `users` (`employee_number`)'
        );
        await queryRunner.query('CREATE INDEX `IDX_clients_id_number` ON `clients` (`id_number`)');
        await queryRunner.query('CREATE INDEX `IDX_clients_email` ON `clients` (`email`)');
        await queryRunner.query('CREATE INDEX `IDX_clients_status` ON `clients` (`status`)');
        await queryRunner.query(
            'CREATE INDEX `IDX_clients_assigned_agent_id` ON `clients` (`assigned_agent_id`)'
        );
        await queryRunner.query('CREATE INDEX `IDX_notes_client_id` ON `notes` (`client_id`)');
        await queryRunner.query(
            'CREATE INDEX `IDX_notes_created_by_user_id` ON `notes` (`created_by_user_id`)'
        );
        await queryRunner.query('CREATE INDEX `IDX_notes_type` ON `notes` (`type`)');
        await queryRunner.query('CREATE INDEX `IDX_notes_priority` ON `notes` (`priority`)');
        await queryRunner.query('CREATE INDEX `IDX_tasks_client_id` ON `tasks` (`client_id`)');
        await queryRunner.query(
            'CREATE INDEX `IDX_tasks_assigned_to_user_id` ON `tasks` (`assigned_to_user_id`)'
        );
        await queryRunner.query('CREATE INDEX `IDX_tasks_status` ON `tasks` (`status`)');
        await queryRunner.query('CREATE INDEX `IDX_tasks_priority` ON `tasks` (`priority`)');
        await queryRunner.query('CREATE INDEX `IDX_tasks_due_date` ON `tasks` (`due_date`)');
        await queryRunner.query(
            'CREATE INDEX `IDX_communications_client_id` ON `communications` (`client_id`)'
        );
        await queryRunner.query(
            'CREATE INDEX `IDX_communications_handled_by_user_id` ON `communications` (`handled_by_user_id`)'
        );
        await queryRunner.query(
            'CREATE INDEX `IDX_communications_type` ON `communications` (`type`)'
        );
        await queryRunner.query(
            'CREATE INDEX `IDX_communications_direction` ON `communications` (`direction`)'
        );
        await queryRunner.query(
            'CREATE INDEX `IDX_communications_status` ON `communications` (`status`)'
        );
        await queryRunner.query(
            'CREATE INDEX `IDX_communications_sent_at` ON `communications` (`sent_at`)'
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('DROP TABLE `communications`');
        await queryRunner.query('DROP TABLE `tasks`');
        await queryRunner.query('DROP TABLE `notes`');
        await queryRunner.query('DROP TABLE `clients`');
        await queryRunner.query('DROP TABLE `users`');
    }
}
