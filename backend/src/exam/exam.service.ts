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
import { UserService } from "../user/user.service";
import { AnswerSheetService } from "../answer-sheet/answer-sheet.service";
import { QueryRunnerService } from "../query-runner/query-runner.service";
import { ExamInvitationService } from "../exam-invitation/exam-invitation.service";

/** external dependencies */
import { Repository } from "typeorm";
import { Pinecone } from "@pinecone-database/pinecone";

import { LLMChain } from "langchain/chains";
import { OpenAI } from "langchain/llms/openai";
import { PromptTemplate } from "langchain/prompts";
import { OpenAIEmbeddings } from "langchain/embeddings/openai";

/** entities */
import { Exam } from "./entities/exam.entity";
import { User } from "../user/entities/user.entity";

/** dtos */
import { InviteDto } from "./dto/invite.dto";
import { CreateExamDto } from "./dto/create-exam.dto";
import { UpdateExamDto } from "./dto/update-exam.dto";
import { SuggestDescriptionDto } from "./dto/suggest-description.dto";

/** utils */
import {
  _create,
  _findOne,
  _findAll,
  _update,
  _delete,
} from "../utils/typeorm.utils";

////////////////////////////////////////////////////////////////////////////////

@Injectable()
export class ExamService implements OnModuleInit {
  public PINECONE_INDEX_NAME: string = "vector-store";
  public PINECONE_INDEX_DIMENSION: number = 1536;
  public PINECONE_INDEX_MODULE: string = "exam-description";

  private userService: UserService;
  private answerSheetService: AnswerSheetService;
  private examInvitationService: ExamInvitationService;

  llm: OpenAI = new OpenAI({
    modelName: "gpt-4",
    temperature: 0,
  });

  vectorStore: Pinecone = new Pinecone({
    apiKey: this.configService.get<string>("PINECONE_API_KEY")!,
    environment: this.configService.get<string>("PINECONE_ENVIRONMENT")!,
  });

  constructor(
    @InjectRepository(Exam)
    private readonly repository: Repository<Exam>,
    private readonly moduleRef: ModuleRef,
    private readonly configService: ConfigService,
    private readonly queryRunner: QueryRunnerService
  ) {}

  onModuleInit() {
    this.userService = this.moduleRef.get(UserService, { strict: false });
    this.answerSheetService = this.moduleRef.get(AnswerSheetService, {
      strict: false,
    });
    this.examInvitationService = this.moduleRef.get(ExamInvitationService, {
      strict: false,
    });
  }

  /** --- basic CRUD methods ---------------------------------------------------*/
  async create(userId: number, createExamDto: CreateExamDto): Promise<Exam> {
    // create exam
    await this.queryRunner.connect();
    await this.queryRunner.startTransaction();

    try {
      const exam = this.repository.create(createExamDto);

      await this.queryRunner.commitTransaction(exam);

      // add exam's metadata to vector store
      await this.manageVectorStore(
        "upsert",
        this.PINECONE_INDEX_NAME,
        exam.id,
        exam.jobTitle,
        exam.jobLevel,
        exam.description
      );

      // set relation between exam and user
      const user = await this.userService.findOne("id", userId);
      await _update(exam.id, { createdBy: user }, this.repository, "exam");

      return exam;
    } catch (err) {
      // rollback changes made in case of error
      await this.queryRunner.rollbackTransaction();
      throw new BadRequestException(err.message);
    } finally {
      // release queryRunner after transaction
      await this.queryRunner.release();
    }
  }

  async findAll(
    key?: string,
    value?: unknown,
    relations?: string[],
    map?: boolean
  ): Promise<Exam[]> {
    if (key && !value) throw new NotFoundException("Value not provided.");

    return (await _findAll(
      this.repository,
      "exam",
      key,
      value,
      relations,
      map
    )) as Exam[];
  }

  async findOne(
    userId: number,
    key: string,
    value: unknown,
    relations?: string[],
    map?: boolean
  ): Promise<Exam | null> {
    const queryBuilder = this.repository
      .createQueryBuilder("exam")
      .where(`user.${key} = :${key}`, { [key]: value });

    const exam = await queryBuilder.getOne();

    // check if exam exists
    if (!exam) throw new NotFoundException("Exam with given id not found.");

    // check if exam belongs to user or user is enrolled in exam
    if (
      userId !== (await exam.createdBy).id &&
      !(await exam.enrolledUsers).some((candidate) => candidate.id === userId)
    )
      throw new UnauthorizedException(
        "You are not authorized to access this exam."
      );

    if (relations)
      for (const relation of relations) {
        map
          ? queryBuilder.leftJoinAndSelect(`exam.${relation}`, `${relation}`)
          : queryBuilder.loadRelationIdAndMap(
              `${relation}Ref`,
              `exam.${relation}`
            );
      }

    return await queryBuilder.getOne();
  }

  async update(
    userId: number,
    examId: number,
    updateExamDto: UpdateExamDto
  ): Promise<Exam> {
    // check if exam exists and is owned by user
    const exam = await this.findOne(userId, "id", examId);

    // check if exam status is draft
    if (exam!.status !== "draft")
      throw new UnauthorizedException(
        "Exam is not in draft status. Process was aborted."
      );

    // update exam
    await _update(
      examId,
      updateExamDto as Record<string, unknown>,
      this.repository,
      "exam"
    );

    // update exam's metadata in vector store
    const updatedExam = await this.findOne(userId, "id", examId);
    this.manageVectorStore(
      "upsert",
      this.PINECONE_INDEX_NAME,
      updatedExam!.id,
      updatedExam!.jobTitle,
      updatedExam!.jobLevel,
      updatedExam!.description
    );

    return updatedExam!;
  }

  async delete(userId: number, examId: number): Promise<void> {
    // check if exam exists and is owned by user
    const exam = await this.findOne(userId, "id", examId);

    // check if exam status is draft
    if (exam!.status !== "draft")
      throw new UnauthorizedException(
        "Exam is not in draft status. Process was aborted."
      );

    // delete exam
    await _delete(examId, this.repository, "exam");

    // delete exam's metadata from vector store
    this.manageVectorStore("delete", this.PINECONE_INDEX_NAME, examId);
  }

  /** --- custom methods -------------------------------------------------------*/
  async suggestDescription(
    suggestDescriptionDto: SuggestDescriptionDto
  ): Promise<string> {
    // 1. MySQL database: return description based on jobTitle and jobLevel
    const exam = await this.repository
      .createQueryBuilder("exam")
      .select("exam.description")
      .where("exam.jobTitle = :jobTitle", {
        jobTitle: suggestDescriptionDto.jobTitle,
      })
      .andWhere("exam.jobLevel = :jobLevel", {
        jobLevel: suggestDescriptionDto.jobLevel,
      })
      .getOne();

    if (exam) return exam.description;

    // 2. Pinecone: if no description, suggest based on vector similarity
    const pineconeIndex = this.vectorStore.index(this.PINECONE_INDEX_NAME);

    const embeddings = new OpenAIEmbeddings();
    const embeddedQuery = await embeddings.embedQuery(
      `${suggestDescriptionDto.jobTitle}|${suggestDescriptionDto.jobLevel}`
    );

    const queryResponse = await pineconeIndex.query({
      topK: 1,
      vector: embeddedQuery,
      filter: {
        module: { $eq: this.PINECONE_INDEX_MODULE },
      },
      includeMetadata: true,
    });

    if (queryResponse.matches?.length) {
      const match = queryResponse.matches[0];

      if (match.score && match.score >= 0.85) {
        const exam = await this.repository
          .createQueryBuilder("exam")
          .where("user.id = :id", { id: +match.id })
          .getOne();

        if (!exam) throw new NotFoundException("Exam with given id not found.");
        return exam.description;
      }
    }

    // 3. LLM call: if no description, suggest based on LLM
    let prompt = PromptTemplate.fromTemplate(
      "Elabore uma descrição resumida para um teste de recrutamento para uma vaga de {jobTitle} no nível de {jobLevel}. Leve em consideração aspectos socias, como gênero, raça, etnia, orientação sexual, etc. A descrição deve ser similar ao seguinte exemplo: Esse exame de recrutamento ..."
    );

    const chain = new LLMChain({ llm: this.llm, prompt });
    let res = await chain.call(suggestDescriptionDto);

    // if suggested description is too long, prompt LLM to summarize it
    const validateLength = async (
      text: string,
      maxLength: number,
      chain: LLMChain<string, OpenAI<any>>
    ): Promise<string> => {
      let description = text;

      chain.prompt = PromptTemplate.fromTemplate(
        "Resuma a seguinte descrição para um teste de recrutamento para uma vaga de {jobTitle} no nível de {jobLevel}? {description}"
      );

      while (description.length > maxLength) {
        const res = await chain.call({ ...suggestDescriptionDto, description });
        description = res.text;
      }

      return description;
    };

    return validateLength(res.text, 400, chain);
  }

  async fetchOwn(userId: number): Promise<Exam[]> {
    // get exams created by user
    const exams = await this.findAll("createdBy", userId);

    // get user and check if user is candidate
    this.userService =
      this.userService ?? this.moduleRef.get(UserService, { strict: false });

    const user = await this.userService.findOne("id", userId);

    let enrolledExams: Exam[] = [];
    if (user?.roles.includes("candidate")) {
      // get exams user is enrolled in
      enrolledExams = await this.repository
        .createQueryBuilder("exam")
        .leftJoinAndSelect("exam.enrolledUsers", "enrolledUsers")
        .where("enrolledUsers.id = :userId", { userId })
        .getMany();
    }

    // return exams removed duplicates
    return [...exams, ...enrolledExams].filter(
      (exam, index, self) => index === self.findIndex((t) => t.id === exam.id)
    );
  }

  async switchStatus(
    userId: number,
    examId: number,
    status: string
  ): Promise<Exam | Record<string, number>> {
    // try to get exam by id, check if exam exists and is owned by user
    const exam = await this.findOne(userId, "id", examId);

    // validate status. allowed: published and archived
    if (!["published", "archived"].includes(status))
      throw new UnauthorizedException("Invalid status. Process was aborted.");

    if (status === "published") {
      // check if exam has sections
      const sections = await exam!.sections;
      if (sections.length === 0)
        throw new UnauthorizedException(
          "Exam has no sections. Process was aborted."
        );

      let examWeight = 0;

      for (const section of sections) {
        // if sections have questions
        if (!section.questions || !section.questions.length)
          throw new UnauthorizedException(
            "Exam has sections without questions. Process was aborted."
          );

        examWeight += +section.weight;
      }

      // if sections's weights add to 1
      if (examWeight !== 1)
        throw new UnauthorizedException(
          "Exam has sections with weights that do not add to 1. Process was aborted."
        );
    }

    if (status === "archived") {
      // check if exam is published
      if (exam!.status !== "published")
        throw new UnauthorizedException(
          "Exam is not published. Process was aborted."
        );

      // if exam has pending invitations and revoke them
      const pendingInvitations = await this.examInvitationService.findPending(
        "examId",
        String(examId)
      );

      pendingInvitations.forEach(async (invitation) => {
        await this.examInvitationService.reject(invitation.id, -1);
      });

      // if exam has answer sheets, close non-initiated and return days left to finish initiated
      const answerSheets = await exam!.answerSheets;

      answerSheets.forEach(async (answerSheet) => {
        if (answerSheet.deadline) {
          throw new UnauthorizedException(
            "The exam contain pending answer sheets. Process was aborted."
          );
        } else {
          this.answerSheetService.start(userId, answerSheet.id);
          this.answerSheetService.submit(userId, answerSheet.id);
        }
      });
    }

    // switch status of exam
    await this.repository
      .createQueryBuilder()
      .update(Exam)
      .set({ status })
      .where("id = :examId", { examId })
      .execute();

    // return updated exam
    return <Exam>await this.findOne(userId, "id", examId);
  }

  async checkIfArchivable(
    userId: number,
    examId: number
  ): Promise<Record<string, number>> {
    // try to get exam by id, check if exam exists and is owned by user
    const exam = await this.findOne(userId, "id", examId);

    const answerSheets = await exam!.answerSheets;

    const daysRemaining: number[] = [];

    answerSheets.forEach(async (answerSheet) => {
      if (answerSheet.deadline)
        daysRemaining.push(answerSheet.deadline.getTime() - Date.now());
    });

    return {
      daysRemaining: Math.max(...daysRemaining) / 1000,
    };
  }

  async sendInvitations(
    userId: number,
    examId: number,
    inviteDto: InviteDto
  ): Promise<string> {
    // try to get exam by id, check if exam exists and is owned by user
    const exam = await this.findOne(userId, "id", examId);

    // check if exam is published
    if (exam!.status !== "published")
      throw new UnauthorizedException(
        "Exam is not published. Process was aborted."
      );

    // check if email addresses are already in exam
    for (const email of inviteDto.email) {
      if (
        await this.repository
          .createQueryBuilder("exam")
          .leftJoinAndSelect("exam.enrolledUsers", "enrolledUsers")
          .where("exam.id = :examId", { examId })
          .andWhere("enrolledUsers.email = :email", { email })
          .getOne()
      )
        throw new UnauthorizedException(
          "Email address is already enrolled in exam. Process was aborted."
        );
    }

    // for each email address
    for (const email of inviteDto.email) {
      // check if email address is already registered in the system (user)
      const user = <User>await this.userService.findOne("email", email);

      // create exam invitation related to exam and user, if any
      await this.examInvitationService.create(
        userId,
        {
          email,
          expirationInHours: inviteDto.expirationInHours,
        },
        exam!,
        user
      );
    }

    // return message to user with number of invitations sent
    return `Invitations sent to ${inviteDto.email.length} email addresses.`;
  }

  async enrollUser(exam: Exam, user: User): Promise<Exam> {
    // enroll user in exam
    await this.repository
      .createQueryBuilder()
      .relation(Exam, "enrolledUsers")
      .of(exam)
      .add(user);

    // return updated exam
    return <Exam>await this.findOne(user.id, "id", exam.id);
  }

  async fetchCandidates(userId: number, examId: number): Promise<any> {
    // try to get exam by id, check if exam exists and is owned by user
    const exam = await this.findOne(userId, "id", examId);

    // get exam invitations
    const examInvitations = await this.examInvitationService.findAll(
      "exam",
      exam!.id
    );

    let response = [];
    let status: string | undefined;
    for (const invitation of examInvitations) {
      switch (invitation.accepted) {
        case true:
          status = "accepted";
          break;
        case false:
          status = "rejected";
          break;
        case null:
          status = "pending";
      }

      const isExpired =
        invitation.createdAt.getTime() +
          invitation.expirationInHours * 60 * 60 * 1000 <
        Date.now();
      if (status === "pending" && isExpired) status = "expired";

      if (status === "accepted" && !!(await invitation.answerSheet)?.endDate)
        status = "finished";

      if (status === "accepted" && !!(await invitation.answerSheet)?.startDate)
        status = "started";

      const user = await invitation.user;

      response.push({
        id: invitation.id,
        email: invitation.email,
        name: user?.name,
        nickname: user?.nickname,
        logo: user?.logo,
        status,
        answerSheet: (await invitation.answerSheet)?.id,
        aiScore: (await invitation.answerSheet)?.aiScore,
      });
    }
    return response;
  }

  async findSimilarSections(
    userId: number,
    examId: number,
    mode: "general" | "strict" = "general"
  ) {
    const { jobTitle, jobLevel } = (await this.findOne(userId, "id", examId))!;

    let similarExams: any[] = [];
    if (mode === "general") {
      similarExams = await this.repository
        .createQueryBuilder("exam")
        .where("exam.jobTitle = :jobTitle", { jobTitle })
        .andWhere("exam.jobLevel = :jobLevel", { jobLevel })
        .andWhere("exam.id != :examId", { examId })
        .getMany();

      if (!similarExams.length) {
        return similarExams;
      }
    }

    if (mode === "strict") {
      similarExams = await this.repository
        .createQueryBuilder("exam")
        .where("exam.id = :examId", { examId })
        .getMany();
    }

    const similarSections: any[] = [];
    for (let i = 0; i < similarExams.length; i++) {
      const exam = similarExams[i];

      const sections = await this.repository
        .createQueryBuilder("exam")
        .relation(Exam, "sections")
        .of(exam)
        .loadMany();

      const data = sections.map((section) => {
        return {
          id: section.id,
          name: section.name,
          description: section.description,
        };
      });

      similarSections.push(...data);
    }

    return similarSections;
  }

  async manageVectorStore(
    mode: string = "upsert" || "delete",
    pineconeIdx: string,
    examId: number,
    jobTitle?: string,
    jobLevel?: string,
    description?: string
  ): Promise<void> {
    const pineconeIndex = this.vectorStore.index(pineconeIdx);

    if (mode === "upsert") {
      const embeddings = new OpenAIEmbeddings();
      const embeddedDescription = await embeddings.embedDocuments([
        `${jobTitle}|${jobLevel}|${description}`,
      ]);

      if (embeddedDescription[0].length > this.PINECONE_INDEX_DIMENSION)
        throw new Error(
          `Document dimension (${embeddedDescription[0].length}) is larger than index dimension (${this.PINECONE_INDEX_DIMENSION}).`
        );

      const zerosArray: number[] = [];
      for (
        let i = 0;
        i < this.PINECONE_INDEX_DIMENSION - embeddedDescription[0].length;
        i++
      ) {
        zerosArray.push(0);
      }
      embeddedDescription[0].push(...zerosArray);

      await pineconeIndex.upsert([
        {
          id: String(examId),
          values: embeddedDescription[0],
          metadata: {
            module: this.PINECONE_INDEX_MODULE,
          },
        },
      ]);
    }

    if (mode === "delete") pineconeIndex.deleteOne(String(examId));
  }
}
