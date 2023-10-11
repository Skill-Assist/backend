/** nestjs */
import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
  NotImplementedException,
} from "@nestjs/common";
import { ModuleRef } from "@nestjs/core";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";

/** providers */
import { UserService } from "../user/user.service";
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
export class ExamService {
  public PINECONE_EXAM_INDEX_NAME: string = "vector-store";
  public PINECONE_EXAM_INDEX_DIMENSION: number = 2054;
  public PINECONE_EXAM_INDEX_MODULE: string = "exam-description";

  private userService: UserService;
  private examInvitationService: ExamInvitationService;

  private llm: OpenAI = new OpenAI({
    modelName: "gpt-4",
    temperature: 0,
  });

  private vectorStore: Pinecone = new Pinecone({
    apiKey: this.configService.get<string>("PINECONE_API_KEY")!,
    environment: this.configService.get<string>("PINECONE_ENVIRONMENT")!,
  });

  constructor(
    @InjectRepository(Exam)
    private readonly examRepository: Repository<Exam>,
    private readonly moduleRef: ModuleRef,
    private readonly configService: ConfigService,
    private readonly queryRunner: QueryRunnerService
  ) {}

  /** basic CRUD methods */
  async create(userId: number, createExamDto: CreateExamDto): Promise<Exam> {
    // get user service from moduleRef
    this.userService =
      this.userService ?? this.moduleRef.get(UserService, { strict: false });

    // create exam
    const exam = (await _create(
      this.queryRunner,
      this.examRepository,
      createExamDto
    )) as Exam;

    // add exam's metadata to vector store
    await this.manageVectorStore(
      "upsert",
      this.PINECONE_EXAM_INDEX_NAME,
      exam.id,
      exam.jobTitle,
      exam.jobLevel,
      exam.description
    );

    // set relation between exam and user
    const user = await this.userService.findOne("id", userId);
    await _update(exam.id, { createdBy: user }, this.examRepository, "exam");

    // return updated exam
    return await this.findOne(userId, "id", exam.id);
  }

  async findAll(
    key?: string,
    value?: unknown,
    relations?: string[],
    map?: boolean
  ): Promise<Exam[]> {
    if (key && !value) throw new NotFoundException("Value not provided.");

    return (await _findAll(
      this.examRepository,
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
  ): Promise<Exam> {
    const exam = (await _findOne(
      this.examRepository,
      "exam",
      key,
      value
    )) as Exam;

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

    return (await _findOne(
      this.examRepository,
      "exam",
      key,
      value,
      relations,
      map
    )) as Exam;
  }

  async update(
    userId: number,
    examId: number,
    updateExamDto: UpdateExamDto
  ): Promise<Exam> {
    // check if exam exists and is owned by user
    const exam = await this.findOne(userId, "id", examId);

    // check if exam status is draft
    if (exam.status !== "draft")
      throw new UnauthorizedException(
        "Exam is not in draft status. Process was aborted."
      );

    // update exam
    await _update(
      examId,
      updateExamDto as Record<string, unknown>,
      this.examRepository,
      "exam"
    );

    // update exam's metadata in vector store
    const updatedExam = await this.findOne(userId, "id", examId);
    this.manageVectorStore(
      "upsert",
      this.PINECONE_EXAM_INDEX_NAME,
      updatedExam.id,
      updatedExam.jobTitle,
      updatedExam.jobLevel,
      updatedExam.description
    );

    return updatedExam;
  }

  async delete(userId: number, examId: number): Promise<void> {
    // check if exam exists and is owned by user
    const exam = await this.findOne(userId, "id", examId);

    // check if exam status is draft
    if (exam.status !== "draft")
      throw new UnauthorizedException(
        "Exam is not in draft status. Process was aborted."
      );

    // delete exam
    await _delete(examId, this.examRepository, "exam");

    // delete exam's metadata from vector store
    this.manageVectorStore("delete", this.PINECONE_EXAM_INDEX_NAME, examId);
  }

  /** custom methods */
  async fetchOwn(userId: number): Promise<Exam[]> {
    // get exams created by user
    const exams = await this.findAll("createdBy", userId);

    // get exams user is enrolled in
    const enrolledExams = await this.examRepository
      .createQueryBuilder("exam")
      .leftJoinAndSelect("exam.enrolledUsers", "enrolledUsers")
      .where("enrolledUsers.id = :userId", { userId })
      .getMany();

    // return exams removed duplicates
    return [...exams, ...enrolledExams].filter(
      (exam, index, self) => index === self.findIndex((t) => t.id === exam.id)
    );
  }

  async switchStatus(
    userId: number,
    examId: number,
    status: string
  ): Promise<Exam> {
    // try to get exam by id, check if exam exists and is owned by user
    const exam = await this.findOne(userId, "id", examId);

    // validate status. allowed: draft, published, archived
    if (!["draft", "published", "archived"].includes(status))
      throw new UnauthorizedException("Invalid status. Process was aborted.");

    // if status is published, check if exam is draft
    if (status === "published" && exam.status !== "draft")
      throw new UnauthorizedException(
        "Exam is not in draft status. Process was aborted."
      );

    // if status is archived, throw not implemented exception
    if (status === "archived")
      throw new NotImplementedException(
        "Switching exam status to archived is not implemented yet."
      );

    // if status is published check if:
    if (status === "published") {
      // exam has sections
      const sections = await exam!.sections;
      if (sections.length === 0)
        throw new UnauthorizedException(
          "Exam has no sections. Process was aborted."
        );

      let examWeight = 0;

      for (const section of sections) {
        // sections have questions
        if (!section.questions || !section.questions.length)
          throw new UnauthorizedException(
            "Exam has sections without questions. Process was aborted."
          );

        examWeight += +section.weight;
      }

      // sections's weights add to 1
      if (examWeight !== 1)
        throw new UnauthorizedException(
          "Exam has sections with weights that do not add to 1. Process was aborted."
        );
    }

    // switch status of exam
    await this.examRepository
      .createQueryBuilder()
      .update(Exam)
      .set({ status })
      .where("id = :examId", { examId })
      .execute();

    // return updated exam
    return <Exam>await this.findOne(userId, "id", examId);
  }

  async sendInvitations(
    userId: number,
    examId: number,
    inviteDto: InviteDto
  ): Promise<string> {
    // get user service and exam invitation service from moduleRef
    this.userService =
      this.userService ?? this.moduleRef.get(UserService, { strict: false });
    this.examInvitationService =
      this.examInvitationService ??
      this.moduleRef.get(ExamInvitationService, {
        strict: false,
      });

    // try to get exam by id, check if exam exists and is owned by user
    const exam = await this.findOne(userId, "id", examId);

    // check if exam is published
    if (exam.status !== "published")
      throw new UnauthorizedException(
        "Exam is not published. Process was aborted."
      );

    // check if email addresses are already in exam
    for (const email of inviteDto.email) {
      if (
        await this.examRepository
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
        exam,
        user
      );
    }

    // return message to user with number of invitations sent
    return `Invitations sent to ${inviteDto.email.length} email addresses.`;
  }

  async enrollUser(exam: Exam, user: User): Promise<Exam> {
    // enroll user in exam
    await this.examRepository
      .createQueryBuilder()
      .relation(Exam, "enrolledUsers")
      .of(exam)
      .add(user);

    // return updated exam
    return <Exam>await this.findOne(user.id, "id", exam.id);
  }

  async fetchCandidates(userId: number, examId: number): Promise<any> {
    // get ExamInvitationService from moduleRef
    this.examInvitationService =
      this.examInvitationService ??
      this.moduleRef.get(ExamInvitationService, {
        strict: false,
      });

    // try to get exam by id, check if exam exists and is owned by user
    const exam = await this.findOne(userId, "id", examId);

    // get exam invitations
    const examInvitations = await this.examInvitationService.findAll(
      "exam",
      exam.id
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
    const { jobTitle, jobLevel } = await this.findOne(userId, "id", examId);

    let similarExams: any[] = [];
    if (mode === "general") {
      similarExams = await this.examRepository
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
      similarExams = await this.examRepository
        .createQueryBuilder("exam")
        .where("exam.id = :examId", { examId })
        .getMany();
    }

    const similarSections: any[] = [];
    for (let i = 0; i < similarExams.length; i++) {
      const exam = similarExams[i];

      const sections = await this.examRepository
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

  async suggestDescription(
    suggestDescriptionDto: SuggestDescriptionDto
  ): Promise<string> {
    // 1. MySQL database: return description based on jobTitle and jobLevel
    const exam = await this.examRepository
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
    const pineconeIndex = this.vectorStore.index(this.PINECONE_EXAM_INDEX_NAME);

    const embeddings = new OpenAIEmbeddings();
    const embeddedQuery = await embeddings.embedQuery(
      `${suggestDescriptionDto.jobTitle}|${suggestDescriptionDto.jobLevel}`
    );

    if (embeddedQuery.length > this.PINECONE_EXAM_INDEX_DIMENSION)
      throw new Error(
        `Query dimension (${embeddedQuery.length}) is larger than index dimension (${this.PINECONE_EXAM_INDEX_DIMENSION}).`
      );

    const zerosArray: number[] = [];
    for (
      let i = 0;
      i < this.PINECONE_EXAM_INDEX_DIMENSION - embeddedQuery.length;
      i++
    ) {
      zerosArray.push(0);
    }
    embeddedQuery.push(...zerosArray);

    const queryResponse = await pineconeIndex.query({
      topK: 1,
      vector: embeddedQuery,
      filter: {
        module: { $eq: this.PINECONE_EXAM_INDEX_MODULE },
      },
      includeMetadata: true,
    });

    if (queryResponse.matches) {
      const match = queryResponse.matches[0];

      if (match.score && match.score >= 0.85) {
        // prettier-ignore
        const exam = (await _findOne(this.examRepository, "exam", "id", +match.id)) as Exam;

        const prompt = PromptTemplate.fromTemplate(
          "Adapte a descrição a seguir para um teste de recrutamento cujo título é {jobTitle} no nível de {jobLevel}? {description}. Leve em consideração aspectos socias, como gênero, raça, etnia, orientação sexual, etc., se estiverem implícitos na descrição do título da vaga. A descrição deve ser similar ao seguinte exemplo: O exame de recrutamento para {jobTitle} {jobLevel} ..."
        );

        const chain = new LLMChain({ llm: this.llm, prompt });
        let res = await chain.call({
          ...suggestDescriptionDto,
          description: exam.description,
        });

        return res.text;
      }
    }

    // 3. LLM call: if no description, suggest based on LLM
    let prompt = PromptTemplate.fromTemplate(
      "Elabore uma descrição resumida para um teste de recrutamento para uma vaga de {jobTitle} no nível de {jobLevel}. Leve em consideração aspectos socias, como gênero, raça, etnia, orientação sexual, etc."
    );

    const chain = new LLMChain({ llm: this.llm, prompt });
    let res = await chain.call(suggestDescriptionDto);

    // if description is too long, prompt LLM to summarize it
    while (res.text.length > 400) {
      chain.prompt = PromptTemplate.fromTemplate(
        "Resuma a seguinte descrição para um teste de recrutamento para uma vaga de {jobTitle} no nível de {jobLevel}? {description}"
      );

      res = await chain.call({
        ...suggestDescriptionDto,
        description: res.text,
      });
    }

    return res.text;
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

      if (embeddedDescription[0].length > this.PINECONE_EXAM_INDEX_DIMENSION)
        throw new Error(
          `Document dimension (${embeddedDescription[0].length}) is larger than index dimension (${this.PINECONE_EXAM_INDEX_DIMENSION}).`
        );

      const zerosArray: number[] = [];
      for (
        let i = 0;
        i < this.PINECONE_EXAM_INDEX_DIMENSION - embeddedDescription[0].length;
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
            module: this.PINECONE_EXAM_INDEX_MODULE,
          },
        },
      ]);
    }

    if (mode === "delete") pineconeIndex.deleteOne(String(examId));
  }
}
