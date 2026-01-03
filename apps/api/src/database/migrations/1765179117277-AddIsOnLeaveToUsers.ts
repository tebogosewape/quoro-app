import { MigrationInterface, QueryRunner } from "typeorm";

export class AddIsOnLeaveToUsers1765179117277 implements MigrationInterface {
    name = 'AddIsOnLeaveToUsers1765179117277'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`users\` ADD \`is_on_leave\` tinyint(1) NOT NULL COMMENT 'Whether the agent is currently on leave and cannot receive new leads' DEFAULT '0'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`users\` DROP COLUMN \`is_on_leave\``);
    }

}
