/** nestjs */
import { BadRequestException, NotFoundException } from "@nestjs/common";

/** providers */
import { QueryRunnerService } from "../query-runner/query-runner.service";

/** external dependencies */
import { Repository } from "typeorm";

/** entities */
import { User } from "../user/entities/user.entity";
import { Exam } from "../exam/entities/exam.entity";
import { Answer } from "../answer/entities/answer.entity";
import { Section } from "../section/entities/section.entity";
import { AnswerSheet } from "../answer-sheet/entities/answer-sheet.entity";
import { ExamInvitation } from "../exam-invitation/entities/exam-invitation.entity";
import { SectionToAnswerSheet } from "../section-to-answer-sheet/entities/section-to-answer-sheet.entity";

/** utils */
import { HandlerEntity, HandlerDto } from "./api-types.utils";
////////////////////////////////////////////////////////////////////////////////

/**
 * @description The purpose of this file is to provide a set of functions that
 * can be used to handle basid CRUD operations in a generic way. This is useful
 * to avoid repeating the same code in different services.
 */

export async function create(
  queryRunner: QueryRunnerService,
  repository: Repository<HandlerEntity>,
  createDto?: HandlerDto
): Promise<HandlerEntity> {
  // create a query runner
  await queryRunner.connect();
  await queryRunner.startTransaction();

  try {
    // try to save entity
    const entity = repository.create(createDto ? createDto : {});
    await queryRunner.commitTransaction(entity);
    return entity;
  } catch (err) {
    // rollback changes made in case of error
    await queryRunner.rollbackTransaction();
    throw new BadRequestException(err.message);
  } finally {
    // release queryRunner after transaction
    await queryRunner.release();
  }
}

export async function findAll(
  repository: Repository<HandlerEntity>,
  entityName: string,
  key?: string,
  value?: unknown,
  relations?: string[],
  map?: boolean
): Promise<HandlerEntity[]> {
  // create query builder
  const queryBuilder = repository.createQueryBuilder(entityName);

  // apply filter if provided
  if (key)
    queryBuilder.where(`${entityName}.${key} = :${key}`, { [key]: value });

  // apply relations if provided
  if (relations)
    for (const relation of relations)
      map
        ? queryBuilder.leftJoinAndSelect(
            `${entityName}.${relation}`,
            `${relation}`
          )
        : queryBuilder.loadRelationIdAndMap(
            `${relation}Ref`,
            `${entityName}.${relation}`
          );

  return await queryBuilder.getMany();
}

export async function findOne(
  repository: Repository<HandlerEntity>,
  entityName: string,
  key: string,
  value: unknown,
  relations?: string[],
  map?: boolean
): Promise<HandlerEntity | null> {
  const queryBuilder = repository
    .createQueryBuilder(entityName)
    .where(`${entityName}.${key} = :${key}`, { [key]: value });

  if (relations)
    for (const relation of relations)
      map
        ? queryBuilder.leftJoinAndSelect(
            `${entityName}.${relation}`,
            `${relation}`
          )
        : queryBuilder.loadRelationIdAndMap(
            `${relation}Ref`,
            `${entityName}.${relation}`
          );

  return await queryBuilder.getOne();
}

export async function update(
  id: number,
  payload: Record<string, unknown>,
  repository: Repository<HandlerEntity>,
  targetEntity: string
): Promise<void> {
  const entityMap = {
    exam: Exam,
    section: Section,
    examInvitation: ExamInvitation,
    answerSheet: AnswerSheet,
    sectionToAnswerSheet: SectionToAnswerSheet,
    answer: Answer,
    default: User,
  };

  const Entity =
    entityMap[targetEntity as keyof typeof entityMap] || entityMap.default;

  const data = await repository
    .createQueryBuilder()
    .update(Entity)
    .set(payload)
    .where("id = :id", { id })
    .execute();

  // check if entity was updated
  if (!data.affected) throw new NotFoundException(`${targetEntity} not found.`);
}
