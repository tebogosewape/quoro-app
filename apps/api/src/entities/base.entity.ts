import {
    PrimaryGeneratedColumn,
    CreateDateColumn,
    UpdateDateColumn,
    DeleteDateColumn,
    Column,
    BaseEntity as TypeOrmBaseEntity,
} from 'typeorm';

export abstract class BaseEntity extends TypeOrmBaseEntity {
    @PrimaryGeneratedColumn('uuid')
        id!: string;

    @CreateDateColumn({
        type: 'datetime',
        name: 'created_at',
        comment: 'Timestamp when the record was created',
    })
        createdAt!: Date;

    @UpdateDateColumn({
        type: 'datetime',
        name: 'updated_at',
        comment: 'Timestamp when the record was last updated',
    })
        updatedAt!: Date;

    @DeleteDateColumn({
        type: 'datetime',
        name: 'deleted_at',
        nullable: true,
        comment: 'Timestamp when the record was soft deleted',
    })
        deletedAt?: Date;

    @Column({
        name: 'created_by',
        type: 'varchar',
        length: 36,
        nullable: true,
        comment: 'ID of the user who created this record',
    })
        createdBy?: string;

    @Column({
        name: 'updated_by',
        type: 'varchar',
        length: 36,
        nullable: true,
        comment: 'ID of the user who last updated this record',
    })
        updatedBy?: string;

    @Column({
        name: 'version',
        type: 'int',
        default: 1,
        comment: 'Optimistic locking version',
    })
        version!: number;
}
