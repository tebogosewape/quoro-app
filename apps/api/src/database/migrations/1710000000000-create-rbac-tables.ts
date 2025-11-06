import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableUnique } from 'typeorm';

export class CreateRbacTables1710000000000 implements MigrationInterface {
    name = 'CreateRbacTables1710000000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // roles
        await queryRunner.createTable(
            new Table({
                name: 'roles',
                columns: [
                    { name: 'id', type: 'char', length: '36', isPrimary: true, default: 'uuid()' },
                    { name: 'slug', type: 'varchar', length: '64', isNullable: false },
                    { name: 'name', type: 'varchar', length: '128', isNullable: false },
                    { name: 'description', type: 'varchar', length: '256', isNullable: true },
                    { name: 'created_at', type: 'datetime', default: 'CURRENT_TIMESTAMP' },
                    {
                        name: 'updated_at',
                        type: 'datetime',
                        default: 'CURRENT_TIMESTAMP',
                        onUpdate: 'CURRENT_TIMESTAMP',
                    },
                ],
                uniques: [new TableUnique({ columnNames: ['slug'] })],
            }),
            true
        );

        // permissions
        await queryRunner.createTable(
            new Table({
                name: 'permissions',
                columns: [
                    { name: 'id', type: 'char', length: '36', isPrimary: true, default: 'uuid()' },
                    { name: 'key', type: 'varchar', length: '128', isNullable: false },
                    { name: 'description', type: 'varchar', length: '256', isNullable: true },
                    { name: 'created_at', type: 'datetime', default: 'CURRENT_TIMESTAMP' },
                    {
                        name: 'updated_at',
                        type: 'datetime',
                        default: 'CURRENT_TIMESTAMP',
                        onUpdate: 'CURRENT_TIMESTAMP',
                    },
                ],
                uniques: [new TableUnique({ columnNames: ['key'] })],
            }),
            true
        );

        // role_permissions
        await queryRunner.createTable(
            new Table({
                name: 'role_permissions',
                columns: [
                    { name: 'id', type: 'char', length: '36', isPrimary: true, default: 'uuid()' },
                    { name: 'roleId', type: 'char', length: '36', isNullable: false },
                    { name: 'permissionId', type: 'char', length: '36', isNullable: false },
                    { name: 'created_at', type: 'datetime', default: 'CURRENT_TIMESTAMP' },
                ],
                uniques: [new TableUnique({ columnNames: ['roleId', 'permissionId'] })],
                foreignKeys: [
                    new TableForeignKey({
                        columnNames: ['roleId'],
                        referencedTableName: 'roles',
                        referencedColumnNames: ['id'],
                        onDelete: 'CASCADE',
                    }),
                    new TableForeignKey({
                        columnNames: ['permissionId'],
                        referencedTableName: 'permissions',
                        referencedColumnNames: ['id'],
                        onDelete: 'CASCADE',
                    }),
                ],
            }),
            true
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropTable('role_permissions', true);
        await queryRunner.dropTable('permissions', true);
        await queryRunner.dropTable('roles', true);
    }
}
