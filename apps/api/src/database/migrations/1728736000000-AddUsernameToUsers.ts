import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddUsernameToUsers1728736000000 implements MigrationInterface {
    name = 'AddUsernameToUsers1728736000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.addColumn(
            'users',
            new TableColumn({
                name: 'username',
                type: 'varchar',
                length: '100',
                isNullable: true,
                isUnique: true,
                comment: 'Unique username that can be used to sign in',
            })
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropColumn('users', 'username');
    }
}
