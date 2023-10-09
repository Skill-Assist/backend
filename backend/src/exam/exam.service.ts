/** nestjs */
import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
  NotImplementedException,
} from "@nestjs/common";
import { ModuleRef } from "@nestjs/core";
import { InjectRepository } from "@nestjs/typeorm";

/** providers */
import { UserService } from "../user/user.service";
import { QueryRunnerService } from "../query-runner/query-runner.service";
import { ExamInvitationService } from "../exam-invitation/exam-invitation.service";

/** external dependencies */
import { Repository } from "typeorm";

import {
  PromptTemplate,
  FewShotPromptTemplate,
  SemanticSimilarityExampleSelector,
} from "langchain/prompts";
import { LLMChain } from "langchain/chains";
import { OpenAI } from "langchain/llms/openai";
import { OpenAIEmbeddings } from "langchain/embeddings/openai";
import { MemoryVectorStore } from "langchain/vectorstores/memory";
import { CustomListOutputParser } from "langchain/output_parsers";
import { ScoreThresholdRetriever } from "langchain/retrievers/score_threshold";

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
  private userService: UserService;
  private examInvitationService: ExamInvitationService;

  private llm: OpenAI = new OpenAI({
    modelName: "gpt-4",
    temperature: 0,
  });

  constructor(
    @InjectRepository(Exam)
    private readonly examRepository: Repository<Exam>,
    private readonly moduleRef: ModuleRef,
    private readonly queryRunner: QueryRunnerService
  ) {}

  /** basic CRUD methods */
  async create(userId: number, createExamDto: CreateExamDto): Promise<Exam> {
    // get user service from moduleRef
    this.userService =
      this.userService ?? this.moduleRef.get(UserService, { strict: false });

    // create exam
    const exam = await _create(
      this.queryRunner,
      this.examRepository,
      createExamDto
    );

    // set relation between exam and user
    const user = <User>await this.userService.findOne("id", userId);
    await _update(exam.id, { createdBy: user }, this.examRepository, "exam");

    // return updated exam
    return <Exam>await this.findOne(userId, "id", exam.id);
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

    return <Exam>await this.findOne(userId, "id", examId);
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

    // check if exam is published or live
    if (!["published", "live"].includes(exam!.status))
      throw new UnauthorizedException(
        "Exam is not published or live. Process was aborted."
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
        exam!,
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

  async suggestDescription(
    suggestDescriptionDto: SuggestDescriptionDto
  ): Promise<string> {
    // 1. MySQL database: return exam description of most similar exam based on similarity with jobTitle and jobLevel

    // find all exam descriptions in database
    const exams = await this.examRepository
      .createQueryBuilder("exam")
      .select("exam.description")
      .addSelect("exam.jobTitle")
      .addSelect("exam.jobLevel")
      .getMany();

    // instantiate vector store with data from these exams
    // in production, this should adapted to use a persistent vector store and updated with new data
    const data = exams.map((e) => {
      return `${e.jobTitle}| ${e.jobLevel}| ${e.description}`;
    });

    const store = await MemoryVectorStore.fromTexts(
      data,
      {},
      new OpenAIEmbeddings()
    );

    // instantiate new retriever to search for relevant documents given some similarity score threshold
    const retriever = ScoreThresholdRetriever.fromVectorStore(store, {
      minSimilarityScore: 0.85,
      maxK: 5,
      kIncrement: 2,
    });

    // search for relevant documents based on jobTitle and jobLevel
    const result = await retriever.getRelevantDocuments(
      `${suggestDescriptionDto.jobTitle} | ${suggestDescriptionDto.jobLevel}`
    );

    // if a relevant document was found, adapt it to current context, if necessary
    if (result.length) {
      const parser = new CustomListOutputParser({ length: 3, separator: "|" });
      const parsedOutput = await parser.invoke(result[0].pageContent);

      if (
        parsedOutput[0] === suggestDescriptionDto.jobTitle &&
        parsedOutput[1] === suggestDescriptionDto.jobLevel
      ) {
        return parsedOutput[2];
      }

      const prompt = PromptTemplate.fromTemplate(
        "Adapte a descrição a seguir para um exame de {jobTitle} no nível de {jobLevel}? {description}"
      );

      const chain = new LLMChain({ llm: this.llm, prompt });
      let res = await chain.call({
        ...suggestDescriptionDto,
        description: parsedOutput[2],
      });

      return res.text;
    }

    // 2. LLM call: if no proper description is found based on vectors, suggest new one altogether

    // query LLM for new description based on jobTitle and jobLevel
    let prompt = PromptTemplate.fromTemplate(
      "Elabore uma descrição resumida para um teste de recrutamento para uma vaga de {jobTitle} no nível de {jobLevel}?"
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

    // return new description
    return res.text;
  }

  async suggestSections(userId: number, examId: number): Promise<any> {
    // try to get exam by id, check if exam exists and is owned by user
    const exam = await this.findOne(userId, "id", examId);

    // 1. MySQL database: return sections from exams with similar descriptions and comparable jobTitles and jobLevels

    // find all exam descriptions in database, except from current exam description
    const jobDescriptions = await this.examRepository
      .createQueryBuilder("exam")
      .select("exam.description")
      .addSelect("exam.jobTitle")
      .addSelect("exam.jobLevel")
      .addSelect("exam.id")
      .where("exam.id != :examId", { examId })
      // .distinct(true)     check if this is necessary
      .getRawMany();

    // instantiate example prompt and example selector, required for dynamic prompting
    const examplePrompt = PromptTemplate.fromTemplate("{exam_id}");

    const exampleSelector =
      await SemanticSimilarityExampleSelector.fromExamples(
        jobDescriptions,
        new OpenAIEmbeddings(),
        MemoryVectorStore,
        { k: 5 }
      );

    const dynamicPrompt = new FewShotPromptTemplate({
      exampleSelector,
      examplePrompt,
      inputVariables: ["exam_description"],
    });

    // format prompt with current exam description
    const similarDescriptions = await dynamicPrompt.format({
      exam_description: exam.description,
    });

    // parse output into array of most similar exam ids
    const parser = new CustomListOutputParser({ separator: "\n\n" });
    const parsedOutputArr = await parser.invoke(similarDescriptions);
    const similarExamIds = parsedOutputArr.map((id) => {
      return +id;
    });

    // starting from highest similarity, return sections from similar exams until 3 sections are found
    const suggestedSections = [];
    for (const id of similarExamIds) {
      const exam = await this.findOne(userId, "id", id, ["sections"], true);
      suggestedSections.push(...(await exam.sections));
    }

    return { ...exam, suggestedSections: suggestedSections.slice(0, 3) };

    // 2. Vector Store: if not enough sections are found, suggest new sections based on vector store

    // 3. LLM call: if not enough sections are found, suggest new ones altogether
  }
}
