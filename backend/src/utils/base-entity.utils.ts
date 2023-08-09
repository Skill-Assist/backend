import {
  Column,
  VersionColumn,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  PrimaryGeneratedColumn,
  BaseEntity as TypeOrmBaseEntity,
} from "typeorm";
import { Exclude } from "class-transformer";
////////////////////////////////////////////////////////////////////////////////

/**
 * Base entity class includes common fields and hooks
 * @see https://typeorm.io/entity-inheritance
 */
export abstract class SQLBaseEntity extends TypeOrmBaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Exclude()
  @Column({ default: true })
  isActive: boolean;

  @Exclude()
  @CreateDateColumn()
  createdAt: Date;

  @Exclude()
  @UpdateDateColumn()
  updatedAt: Date;

  @Exclude()
  @DeleteDateColumn()
  deletedAt?: Date;

  @Exclude()
  @VersionColumn()
  version: number;
}
