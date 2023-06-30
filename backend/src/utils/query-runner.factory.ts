/** nestjs */
import { Injectable } from "@nestjs/common";

/** external dependencies */
import { DataSource, QueryRunner } from "typeorm";

/** entities */
import { Exam } from "../exam/entities/exam.entity";
import { User } from "../user/entities/user.entity";
import { Answer } from "../answer/entities/answer.entity";
import { Section } from "../section/entities/section.entity";
import { Question } from "../question/schemas/question.schema";
import { AnswerSheet } from "../answer-sheet/entities/answer-sheet.entity";
import { ExamInvitation } from "../exam-invitation/entities/exam-invitation.entity";
import { SectionToAnswerSheet } from "../section-to-answer-sheet/entities/section-to-answer-sheet.entity";
////////////////////////////////////////////////////////////////////////////////

/**
 * QueryRunnerEntity
 * @description this type defines the entities that can be passed to the
 * QueryRunnerFactory.
 */
type QueryRunnerEntity =
  | User
  | Exam
  | Section
  | Question
  | Answer
  | AnswerSheet
  | SectionToAnswerSheet
  | ExamInvitation;

/**
 * QueryRunnerInterface
 * @description this interface defines the methods that a query runner must implement.
 */
interface QueryRunnerInterface {
  connect(): Promise<void>;
  startTransaction(): Promise<void>;
  commitTransaction(obj: QueryRunnerEntity): Promise<QueryRunnerEntity>;
  rollbackTransaction(): Promise<void>;
  release(): Promise<void>;
}

/**
 * QueryRunnerFactory
 *
 * @description QueryRunnerFactory is implemented as a helper class to enable
 * testing without mocking the entire DataSource object (which exposes several methods).
 * @implements {QueryRunnerInterface} with a limited set of methods required to
 * maintain transactions, making testing more straightforward.
 *
 * @see https://docs.nestjs.com/techniques/database#typeorm-transactions
 */
@Injectable()
export class QueryRunnerFactory implements QueryRunnerInterface {
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
