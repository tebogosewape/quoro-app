import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddRefreshTokenToUser1728425678901 implements MigrationInterface {
    name = 'AddRefreshTokenToUser1728425678901';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.addColumn(
            'users',
            new TableColumn({
                name: 'refresh_token_hash',
                type: 'varchar',
                length: '500',
                isNullable: true,
                comment: 'Hashed refresh token for JWT authentication',
            })
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropColumn('users', 'refresh_token_hash');
    }
}
