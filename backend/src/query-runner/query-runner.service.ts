/** nestjs */
import { Injectable } from "@nestjs/common";

/** external dependencies */
import { DataSource, QueryRunner } from "typeorm";

/** utils */
import { QueryRunnerInterface, QueryRunnerEntity } from "../utils/types.utils";
////////////////////////////////////////////////////////////////////////////////

/**
 * @description QueryRunnerService is implemented as a helper service to enable
 * testing without mocking the entire DataSource object (which exposes several methods).
 * @implements {QueryRunnerInterface} with a limited set of methods required to
 * maintain transactions, making testing more straightforward.
 *
 * @see https://docs.nestjs.com/techniques/database#typeorm-transactions
 */
@Injectable()
export class QueryRunnerService implements QueryRunnerInterface {
  private queryRunner: QueryRunner;

  constructor(private readonly dataSource: DataSource) {}

  async connect(): Promise<void> {
    this.queryRunner = this.dataSource.createQueryRunner();
    await this.queryRunner.connect();
  }

  async startTransaction(): Promise<void> {
    if (!this.queryRunner) {
      throw new Error("QueryRunner not initialized");
    }

    return await this.queryRunner.startTransaction();
  }

  async commitTransaction(obj: QueryRunnerEntity): Promise<QueryRunnerEntity> {
    if (!this.queryRunner) throw new Error("QueryRunner not initialized");

    const entity = await this.queryRunner.manager.save(obj);
    await this.queryRunner.commitTransaction();
    return entity;
  }

  async rollbackTransaction(): Promise<void> {
    if (!this.queryRunner) throw new Error("QueryRunner not initialized");

    return await this.queryRunner.rollbackTransaction();
  }

  async release(): Promise<void> {
    if (!this.queryRunner) throw new Error("QueryRunner not initialized");
    return await this.queryRunner.release();
  }
}
