/** nestjs */
import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import { ModuleRef } from "@nestjs/core";
import { InjectRepository } from "@nestjs/typeorm";

/** providers */
import { AnswerService } from "../answer/answer.service";
import { SectionService } from "../section/section.service";
import { QueryRunnerService } from "../query-runner/query-runner.service";
import { AnswerSheetService } from "../answer-sheet/answer-sheet.service";

/** external dependencies */
import { Repository } from "typeorm";

/** entities */
import { SectionToAnswerSheet } from "./entities/section-to-answer-sheet.entity";

/** dtos */
import { UpdateSectionToAnswerSheetDto } from "./dto/update-section-to-answer-sheet.dto";

/** utils */
import { create, findOne, findAll, update } from "../utils/typeorm.utils";
////////////////////////////////////////////////////////////////////////////////

@Injectable()
export class SectionToAnswerSheetService {
  private answerService: AnswerService;
  private answerSheetService: AnswerSheetService;

  constructor(
    @InjectRepository(SectionToAnswerSheet)
    private readonly sectionToAnswerSheetRepository: Repository<SectionToAnswerSheet>,
    private readonly moduleRef: ModuleRef,
    private readonly sectionService: SectionService,
    private readonly queryRunner: QueryRunnerService
  ) {}

  /** basic CRUD methods */
  async create(
    userId: number,
    sectionId: number,
    answerSheetId: number
  ): Promise<SectionToAnswerSheet> {
    // get answer service from moduleRef
    this.answerSheetService =
      this.answerSheetService ??
      this.moduleRef.get<AnswerSheetService>(AnswerSheetService, {
        strict: false,
      });

    // check if section exists and user is enrolled in exam
    const section = await this.sectionService.findOne(userId, "id", sectionId);

    // check if answer sheet exists and user owns it
    const answerSheet = await this.answerSheetService.findOne(
      userId,
      "id",
      answerSheetId
    );

    // check if answer sheet is started
    if (!answerSheet.deadline)
      throw new UnauthorizedException(
        "Answer sheet is not started. You are not authorized to create this section to answer sheet."
      );

    // check if answer sheet is not submitted
    if (answerSheet.endDate)
      throw new UnauthorizedException(
        "Answer sheet is already submitted. You are not authorized to create this section to answer sheet."
      );

    // check if section to answer sheet already exists
    const sas = await this.sectionToAnswerSheetRepository
      .createQueryBuilder("sectionToAnswerSheet")
      .where("sectionToAnswerSheet.sectionId = :sectionId", { sectionId })
      .andWhere("sectionToAnswerSheet.answerSheetId = :answerSheetId", {
        answerSheetId,
      })
      .getOne();

    if (sas)
      throw new UnauthorizedException(
        "You are not authorized to create this section to answer sheet."
      );

    // create section to answer sheet (SAS)
    const sectionToAnswerSheet = (await create(
      this.queryRunner,
      this.sectionToAnswerSheetRepository
    )) as SectionToAnswerSheet;

    // set relation between SAS and section and answer sheet
    await update(
      sectionToAnswerSheet.id,
      { section, answerSheet },
      this.sectionToAnswerSheetRepository,
      "sectionToAnswerSheet"
    );

    // set deadline for SAS
    const durationInHours = (await sectionToAnswerSheet.section)
      .durationInHours;

    const deadline = new Date(
      durationInHours
        ? Math.min(
            sectionToAnswerSheet.createdAt.getTime() +
              durationInHours * 60 * 60 * 1000,
            answerSheet.deadline.getTime()
          )
        : answerSheet.deadline.getTime()
    );

    await this.update(userId, sectionToAnswerSheet.id, { deadline });

    // return updated section to answer sheet
    return <SectionToAnswerSheet>(
      await this.findOne(userId, "id", sectionToAnswerSheet.id)
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
    userId: number,
    key: string,
    value: unknown,
    relations?: string[],
    map?: boolean
  ): Promise<SectionToAnswerSheet> {
    const sas = (await findOne(
      this.sectionToAnswerSheetRepository,
      "sectionToAnswerSheet",
      key,
      value,
      relations,
      map
    )) as SectionToAnswerSheet;

    // check if SAS exists
    if (!sas) throw new NotFoundException("Section to answer sheet not found.");

    // check if exam belongs to user or user owns section to answer sheet
    const section = await sas.section;
    const exam = await section.exam;
    const answerSheet = await sas.answerSheet;
    if (
      (await exam.createdBy).id !== userId &&
      (await answerSheet.user).id !== userId
    )
      throw new UnauthorizedException(
        "You are not authorized to access this section to answer sheet."
      );

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
    userId: number,
    sasId: number,
    updateSectionToAnswerSheetDto: UpdateSectionToAnswerSheetDto
  ): Promise<SectionToAnswerSheet> {
    // check if SAS exists and user authorized to update it
    await this.findOne(userId, "id", sasId);

    await update(
      sasId,
      updateSectionToAnswerSheetDto as Record<string, unknown>,
      this.sectionToAnswerSheetRepository,
      "sectionToAnswerSheet"
    );

    return <SectionToAnswerSheet>await this.findOne(userId, "id", sasId);
  }

  /** custom methods */
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
    const createAnswerDto = section!.questions.map((question) => {
      return {
        questionRef: question.id,
      };
    });

    await this.answerService.createBatch(
      userId,
      sectionToAnswerSheet.id,
      createAnswerDto
    );

    // return updated section to answer sheet
    return (await this.findOne(userId, "id", sectionToAnswerSheet.id))!;
  }

  async submit(userId: number, sasId: number): Promise<SectionToAnswerSheet> {
    // check if SAS exists and user authorized to update it
    const sas = await this.findOne(userId, "id", sasId);

    // check if SAS is already submitted
    if (sas.endDate)
      throw new UnauthorizedException(
        "Section to answer sheet is already submitted."
      );

    return this.update(userId, sasId, { endDate: new Date() });
  }
}
