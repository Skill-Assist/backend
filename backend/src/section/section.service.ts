/** nestjs */
import {
  Injectable,
  OnModuleInit,
  NotFoundException,
  UnauthorizedException,
  BadRequestException,
} from "@nestjs/common";
import { ModuleRef } from "@nestjs/core";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";

/** providers */
import { ExamService } from "../exam/exam.service";
import { QueryRunnerService } from "../query-runner/query-runner.service";

/** external dependencies */
import { Repository } from "typeorm";
import { Pinecone } from "@pinecone-database/pinecone";
import { OpenAIEmbeddings } from "langchain/embeddings/openai";

/** entities */
import { Section } from "./entities/section.entity";

/** dtos */
import { AddQuestionDto } from "./dto/add-question.dto";
import { CreateSectionDto } from "./dto/create-section.dto";
import { UpdateSectionDto } from "./dto/update-section.dto";
////////////////////////////////////////////////////////////////////////////////

@Injectable()
export class SectionService implements OnModuleInit {
  private PINECONE_INDEX_NAME: string = "vector-store";
  public PINECONE_INDEX_MODULE: string = "section-description";

  private examService: ExamService;

  private vectorStore: Pinecone = new Pinecone({
    apiKey: this.configService.get<string>("PINECONE_API_KEY")!,
    environment: this.configService.get<string>("PINECONE_ENVIRONMENT")!,
  });

  constructor(
    @InjectRepository(Section)
    private readonly repository: Repository<Section>,
    private readonly moduleRef: ModuleRef,
    private readonly configService: ConfigService,
    private readonly queryRunner: QueryRunnerService
  ) {}

  onModuleInit() {
    this.examService = this.moduleRef.get(ExamService, {
      strict: false,
    });
  }

  /** --- basic CRUD methods ---------------------------------------------------*/
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

    // check if exam's sections's weights are less than or equal to 1
    if (
      (await exam.sections).reduce(
        (acc, curr) => acc + +curr.weight,
        createSectionDto.weight
      ) > 1
    )
      throw new UnauthorizedException(
        "The sum of all sections' weights cannot be greater than 1."
      );

    // create section
    await this.queryRunner.connect();
    await this.queryRunner.startTransaction();

    try {
      const section = this.repository.create({
        ...createSectionDto,
        questionId: [],
      } as unknown as Section);

      await this.queryRunner.commitTransaction(section);

      // add section's metadata to vector store
      await this.manageVectorStore(
        "upsert",
        this.PINECONE_INDEX_NAME,
        section.id,
        section.name,
        section.description
      );

      // set relation between section and exam
      await this.repository
        .createQueryBuilder()
        .relation(Section, "exam")
        .of(section)
        .set(exam);

      return section;
    } catch (err) {
      console.log(err.message);

      // rollback changes made in case of error
      await this.queryRunner.rollbackTransaction();
      throw new BadRequestException(err.message);
    } finally {
      // release queryRunner after transaction
      await this.queryRunner.release();
    }
  }

  async findOne(
    userId: number,
    key: string,
    value: unknown,
    relations?: string[],
    map?: boolean
  ): Promise<Section | null> {
    const queryBuilder = this.repository
      .createQueryBuilder("section")
      .where(`section.${key} = :${key}`, { [key]: value });

    const section = await queryBuilder.getOne();

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

    if (relations)
      for (const relation of relations) {
        map
          ? queryBuilder.leftJoinAndSelect(`section.${relation}`, `${relation}`)
          : queryBuilder.loadRelationIdAndMap(
              `${relation}Ref`,
              `section.${relation}`
            );
      }

    return await queryBuilder.getOne();
  }

  async update(
    userId: number,
    sectionId: number,
    updateSectionDto: UpdateSectionDto
  ): Promise<Section> {
    // check if section exists and is owned by user
    const section = await this.findOne(userId, "id", sectionId);
    if (!section) throw new NotFoundException("Section not found.");

    // check if exam is in draft state
    if ((await section.exam).status !== "draft")
      throw new UnauthorizedException(
        "You cannot update a section for an exam that is not in draft state."
      );

    // check if exam's sections's weights are less than or equal to 1
    if (updateSectionDto.weight) {
      const sections = await (await section.exam).sections;
      const updatedWeight =
        sections.reduce((acc, curr, idx) => {
          return acc + +curr.weight;
        }, updateSectionDto.weight) - section.weight;

      if (updatedWeight > 1)
        throw new UnauthorizedException(
          "The sum of all sections' weights cannot be greater than 1."
        );
    }

    // update exam
    await this.repository
      .createQueryBuilder()
      .update()
      .set(updateSectionDto)
      .where("id = :id", { id: sectionId })
      .execute();

    // update section's metadata in vector store
    const updatedSection = (await this.findOne(
      userId,
      "id",
      sectionId
    )) as Section;

    const { id, name, description } = updatedSection;

    this.manageVectorStore(
      "upsert",
      this.PINECONE_INDEX_NAME,
      id,
      name,
      description
    );

    return updatedSection;
  }

  async delete(userId: number, sectionId: number): Promise<void> {
    // check if exam exists and is owned by user
    const section = await this.findOne(userId, "id", sectionId);

    // check if exam is in draft state
    if ((await section!.exam).status !== "draft")
      throw new UnauthorizedException(
        "You cannot delete a section for an exam that is not in draft state."
      );

    // delete section
    await this.repository
      .createQueryBuilder()
      .delete()
      .from(Section)
      .where("id = :id", { id: sectionId })
      .execute();

    // delete section's metadata from vector store
    this.manageVectorStore("delete", this.PINECONE_INDEX_NAME, sectionId);
  }

  /** --- custom methods -------------------------------------------------------*/
  async addtoQuestion(id: number, payload: AddQuestionDto): Promise<void> {
    await this.repository
      .createQueryBuilder()
      .update()
      .set(payload as UpdateSectionDto)
      .where("id = :id", { id })
      .execute();
  }

  async suggestProject(userId: number, examId: number, type: string[]) {
    const exam = await this.examService.findOne(userId, "id", examId);
    if (!exam) throw new NotFoundException("Exam not found.");

    const similarSections: Partial<Section>[] = [];

    // 1. MySQL database
    for (let i = 0; i < type.length; i++) {
      const similar = await this.findSimilarSectionsOnDatabase(
        examId,
        "jobTitle",
        exam.jobTitle,
        type[i]
      );

      if (similar.length > 0) similarSections.push(...similar);
    }

    if (similarSections.length > 0) return similarSections;

    // 2. Pinecone vector store
    const pineconeIndex = this.vectorStore.index(this.PINECONE_INDEX_NAME);

    const embeddings = new OpenAIEmbeddings();
    const embeddedQuery = await embeddings.embedQuery(
      `${exam.jobTitle}|${exam.description}`
    );

    const queryResponse = await pineconeIndex.query({
      topK: 5,
      vector: embeddedQuery,
      filter: {
        module: { $eq: this.examService.PINECONE_INDEX_MODULE },
      },
      includeMetadata: true,
    });

    if (queryResponse.matches?.length) {
      for (let i = 0; i < queryResponse.matches.length; i++) {
        const match = queryResponse.matches[i];

        if (match.id === String(examId)) continue;

        if (match.score && match.score >= 0.75) {
          const similarExam = (
            await this.examService.findAll("id", Number(match.id), ["sections"])
          )[0];

          for (const section_ of await similarExam.sections)
            for (let i = 0; i < type.length; i++) {
              if (section_.type.includes(type[i]))
                similarSections.push({
                  name: section_.name,
                  description: section_.description,
                  type: section_.type,
                });
            }
        }
      }
    }

    if (similarSections.length > 0) return similarSections;

    return null;
  }

  /** --- helper methods -------------------------------------------------------*/
  async manageVectorStore(
    mode: string = "upsert" || "delete",
    pineconeIdx: string,
    examId: number,
    name?: string,
    description?: string
  ): Promise<void> {
    const pineconeIndex = this.vectorStore.index(pineconeIdx);

    if (mode === "upsert") {
      const embeddings = new OpenAIEmbeddings();
      const embeddedDescription = await embeddings.embedDocuments([
        `${name}|${description}`,
      ]);

      await pineconeIndex.upsert([
        {
          id: String(examId),
          values: embeddedDescription[0],
          metadata: {
            module: "section-description",
          },
        },
      ]);
    }

    if (mode === "delete") pineconeIndex.deleteOne(String(examId));
  }

  async findSimilarSectionsOnDatabase(
    examId: number,
    key: string,
    value: string | number,
    type: string
  ): Promise<Partial<Section>[]> {
    const similarExams = (
      await this.examService.findAll(key, value, ["sections"])
    ).filter((exam) => exam.id !== examId);

    const similarSections: Partial<Section>[] = [];

    for (const exam_ of similarExams) {
      const sections = await exam_.sections;

      for (const section_ of sections)
        if (section_.type.includes(type))
          similarSections.push({
            name: section_.name,
            description: section_.description,
            type: section_.type,
          });
    }

    return similarSections;
  }
}
