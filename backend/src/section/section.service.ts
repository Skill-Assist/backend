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
    examId: number,
    createSectionDto: CreateSectionDto
  ): Promise<Section> {
    // check if exam exists
    const exam = await this.examService.findOne("id", examId);
    if (!exam) throw new NotFoundException("Exam not found.");

    // check if exam is in draft state
    if (exam.status !== "draft")
      throw new UnauthorizedException(
        "You cannot create a section for an exam that is not in draft state."
      );

    // check if exam is active
    if (!exam.isActive)
      throw new UnauthorizedException(
        "You cannot create a section for an inactive exam."
      );

    // create section
    const section = await create(this.queryRunner, this.sectionRepository, {
      ...createSectionDto,
      questionId: [],
    });

    // set relation between section and exam
    await update(section.id, { exam }, this.sectionRepository, "section");

    // return updated section
    return <Section>await this.findOne("id", section.id);
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
    key: string,
    value: unknown,
    relations?: string[],
    map?: boolean
  ): Promise<Section | null> {
    return (await findOne(
      this.sectionRepository,
      "section",
      key,
      value,
      relations,
      map
    )) as Section;
  }

  /** custom methods */
  async addtoQuestion(id: number, payload: AddQuestionDto): Promise<void> {
    await update(
      id,
      payload as unknown as Record<string, Array<string | ObjectId>>,
      this.sectionRepository,
      "section"
    );
  }
}
