/** nestjs */
import { ModuleRef } from "@nestjs/core";
import { InjectRepository } from "@nestjs/typeorm";
import { Injectable, NotFoundException } from "@nestjs/common";

/** providers */
import { AnswerService } from "../answer/answer.service";
import { SectionService } from "../section/section.service";
import { QueryRunnerFactory } from "../utils/query-runner.factory";
import { AnswerSheetService } from "../answer-sheet/answer-sheet.service";

/** external dependencies */
import { Repository } from "typeorm";

/** entities & dtos */
import { SectionToAnswerSheet } from "./entities/section-to-answer-sheet.entity";
import { UpdateSectionToAnswerSheetDto } from "./dto/update-section-to-answer-sheet.dto";

/** utils */
import { create, findOne, findAll, update } from "../utils/typeorm.utils";
////////////////////////////////////////////////////////////////////////////////

@Injectable()
export class SectionToAnswerSheetService {
  private answerService: AnswerService;

  constructor(
    @InjectRepository(SectionToAnswerSheet)
    private readonly sectionToAnswerSheetRepository: Repository<SectionToAnswerSheet>,
    private readonly moduleRef: ModuleRef,
    private readonly sectionService: SectionService,
    private readonly queryRunner: QueryRunnerFactory,
    private readonly answerSheetService: AnswerSheetService
  ) {}

  /** basic CRUD methods */
  async create(
    userId: number,
    sectionId: number,
    answerSheetId: number
  ): Promise<SectionToAnswerSheet> {
    // check if section exists and is active
    const section = await this.sectionService.findOne(userId, "id", sectionId);
    if (!section) throw new NotFoundException("Section does not exist.");

    // check if answer sheet exists and is active
    const answerSheet = await this.answerSheetService.findOne(
      "id",
      answerSheetId
    );
    if (!answerSheet)
      throw new NotFoundException("Answer sheet does not exist.");

    // create section to answer sheet
    const sectionToAnswerSheet = await create(
      this.queryRunner,
      this.sectionToAnswerSheetRepository
    );

    // set relation between section to answer sheet and section
    await update(
      sectionToAnswerSheet.id,
      { section },
      this.sectionToAnswerSheetRepository,
      "sectionToAnswerSheet"
    );

    // set relation between section to answer sheet and answer sheet
    await update(
      sectionToAnswerSheet.id,
      { answerSheet },
      this.sectionToAnswerSheetRepository,
      "sectionToAnswerSheet"
    );

    // return updated section to answer sheet
    return <SectionToAnswerSheet>(
      await this.findOne("id", sectionToAnswerSheet.id)
    );
  }

  async findAll(
    key?: string,
    value?: unknown,
    relations?: string[],
    map?: boolean
  ): Promise<SectionToAnswerSheet[]> {
    if (key && !value) throw new NotFoundException("Value not provided.");

    return (await findAll(
      this.sectionToAnswerSheetRepository,
      "sectionToAnswerSheet",
      key,
      value,
      relations,
      map
    )) as SectionToAnswerSheet[];
  }

  async findOne(
    key: string,
    value: unknown,
    relations?: string[],
    map?: boolean
  ): Promise<SectionToAnswerSheet | null> {
    return (await findOne(
      this.sectionToAnswerSheetRepository,
      "sectionToAnswerSheet",
      key,
      value,
      relations,
      map
    )) as SectionToAnswerSheet;
  }

  async update(
    id: number,
    updateSectionToAnswerSheetDto: Partial<UpdateSectionToAnswerSheetDto>
  ): Promise<SectionToAnswerSheet> {
    await update(
      id,
      updateSectionToAnswerSheetDto,
      this.sectionToAnswerSheetRepository,
      "sectionToAnswerSheet"
    );

    return <SectionToAnswerSheet>await this.findOne("id", id);
  }

  /** custom methods */
  // TODO : block double creation of section to answer sheet
  async createBatchAnswer(
    userId: number,
    sectionId: number,
    answerSheetId: number
  ): Promise<SectionToAnswerSheet> {
    // get answer service from moduleRef
    this.answerService =
      this.answerService ??
      this.moduleRef.get(AnswerService, {
        strict: false,
      });

    // create a section to answer sheet
    const sectionToAnswerSheet = await this.create(
      userId,
      sectionId,
      answerSheetId
    );

    // for each question in the section, create an answer
    const section = await this.sectionService.findOne(userId, "id", sectionId);
    const createAnswerDto = section!.questionId.map((question) => {
      return {
        questionRef: question.id,
      };
    });

    await this.answerService.createBatch(
      sectionToAnswerSheet.id,
      createAnswerDto
    );

    // return updated section to answer sheet
    return (await this.findOne("id", sectionToAnswerSheet.id))!;
  }
}
