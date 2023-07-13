/** nestjs */
import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";

/** providers */
import { ExamService } from "../exam/exam.service";
import { QueryRunnerFactory } from "../utils/query-runner.factory";

/** external dependencies */
import { ObjectId } from "mongodb";
import { Repository } from "typeorm";

/** entities & dtos */
import { Section } from "./entities/section.entity";
import { AddQuestionDto } from "./dto/add-question.dto";
import { CreateSectionDto } from "./dto/create-section.dto";
import { UpdateSectionDto } from "./dto/update-section.dto";

/** utils */
import { create, findOne, findAll, update } from "../utils/typeorm.utils";
////////////////////////////////////////////////////////////////////////////////

@Injectable()
export class SectionService {
  constructor(
    @InjectRepository(Section)
    private readonly sectionRepository: Repository<Section>,
    private readonly examService: ExamService,
    private readonly queryRunner: QueryRunnerFactory
  ) {}

  /** basic CRUD methods */
  async create(
    userId: number,
    examId: number,
    createSectionDto: CreateSectionDto
  ): Promise<Section> {
    // check if exam exists and is owned by user
    const exam = await this.examService.findOne(userId, "id", examId);
    if (!exam) throw new NotFoundException("Exam not found.");

    // check if exam is in draft state
    if (exam.status !== "draft")
      throw new UnauthorizedException(
        "You cannot create a section for an exam that is not in draft state."
      );

    // create section
    const section = await create(this.queryRunner, this.sectionRepository, {
      ...createSectionDto,
      questionId: [],
    });

    // set relation between section and exam
    await update(section.id, { exam }, this.sectionRepository, "section");

    // return updated section
    return <Section>await this.findOne(userId, "id", section.id);
  }

  async findAll(
    key?: string,
    value?: unknown,
    relations?: string[],
    map?: boolean
  ): Promise<Section[]> {
    return (await findAll(
      this.sectionRepository,
      "section",
      key,
      value,
      relations,
      map
    )) as Section[];
  }

  async findOne(
    userId: number,
    key: string,
    value: unknown,
    relations?: string[],
    map?: boolean
  ): Promise<Section> {
    const section = (await findOne(
      this.sectionRepository,
      "section",
      key,
      value
    )) as Section;

    // check if section exists
    if (!section) throw new NotFoundException("Section not found.");

    // check if user is authorized to access section
    const exam = await section.exam;
    if (
      (await exam.createdBy).id !== userId &&
      !(await exam.enrolledUsers).some((candidate) => candidate.id === userId)
    )
      throw new UnauthorizedException(
        "You are not authorized to access this section."
      );

    return (await findOne(
      this.sectionRepository,
      "section",
      key,
      value,
      relations,
      map
    )) as Section;
  }

  async update(
    userId: number,
    sectionId: number,
    updateSectionDto: UpdateSectionDto
  ): Promise<Section> {
    // check if exam exists and is owned by user
    await this.findOne(userId, "id", sectionId);

    // update exam
    await update(
      sectionId,
      updateSectionDto as Record<string, unknown>,
      this.sectionRepository,
      "section"
    );
    return <Section>await this.findOne(userId, "id", sectionId);
  }

  /** custom methods */
  async addtoQuestion(id: number, payload: AddQuestionDto): Promise<void> {
    await update(
      id,
      payload as unknown as Record<string, Record<string, ObjectId | number>[]>,
      this.sectionRepository,
      "section"
    );
  }
}
