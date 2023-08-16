/** nestjs */
import {
  Injectable,
  NotFoundException,
  BadRequestException,
  UnauthorizedException,
} from "@nestjs/common";
import { ModuleRef } from "@nestjs/core";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";

/** providers */
import { AwsService } from "../aws/aws.service";
import { NaturalLanguageService } from "../nlp/nlp.service";
import { QuestionService } from "../question/question.service";
import { QueryRunnerService } from "../query-runner/query-runner.service";
import { SectionToAnswerSheetService } from "../section-to-answer-sheet/section-to-answer-sheet.service";

/** external dependencies */
import * as fs from "fs";
import * as path from "path";
import { ObjectId } from "mongodb";
import { getData } from "typechat";
import { Repository } from "typeorm";

/** entities & schemas */
import { Answer } from "./entities/answer.entity";
import { Question } from "../question/schemas/question.schema";

/** dtos */
import { CreateAnswerDto } from "./dto/create-answer.dto";
import { UpdateAnswerDto } from "./dto/update-answer.dto";
import { SubmitAnswersDto } from "./dto/submit-answers.dto";

/** utils */
import { MultipleChoiceGradingCriteria } from "../utils/api-types.utils";
import { create, findOne, findAll, update } from "../utils/typeorm.utils";
////////////////////////////////////////////////////////////////////////////////

@Injectable()
export class AnswerService {
  private sasService: SectionToAnswerSheetService;

  constructor(
    @InjectRepository(Answer)
    private readonly answerRepository: Repository<Answer>,
    private readonly moduleRef: ModuleRef,
    private readonly awsService: AwsService,
    private readonly configService: ConfigService,
    private readonly queryRunner: QueryRunnerService,
    private readonly questionService: QuestionService,
    private readonly naturalLanguageService: NaturalLanguageService
  ) {}

  /** basic CRUD methods */
  async create(
    userId: number,
    sasId: number,
    createAnswerDto: CreateAnswerDto
  ): Promise<Answer> {
    // get sectionToAnswerSheetService from moduleRef
    this.sasService =
      this.sasService ??
      this.moduleRef.get(SectionToAnswerSheetService, {
        strict: false,
      });

    // check if sectionToAnswerSheet exists and belongs to user
    const sectionToAnswerSheet = await this.sasService.findOne(
      userId,
      "id",
      sasId
    );

    // check if question exists
    const question = await this.questionService.findOne(
      new ObjectId(createAnswerDto.questionRef)
    );
    if (!question) throw new NotFoundException("Question not found.");

    // check if question belongs to section
    const section = await sectionToAnswerSheet.section;
    if (!section.questions.some((q) => q.id === createAnswerDto.questionRef))
      throw new BadRequestException(
        "Question does not belong to sectionToAnswerSheet."
      );

    // create answer
    const answer = await create(
      this.queryRunner,
      this.answerRepository,
      createAnswerDto
    );

    // set relation between answer and sectionToAnswerSheet
    await update(
      answer.id,
      { sectionToAnswerSheet },
      this.answerRepository,
      "answer"
    );

    // return updated answer
    return <Answer>await this.findOne(userId, "id", answer.id);
  }

  async findAll(
    key?: string,
    value?: unknown,
    relations?: string[],
    map?: boolean
  ): Promise<Answer[]> {
    if (key && !value) throw new NotFoundException("Value not provided.");

    return (await findAll(
      this.answerRepository,
      "answer",
      key,
      value,
      relations,
      map
    )) as Answer[];
  }

  async findOne(
    userId: number,
    key: string,
    value: unknown,
    relations?: string[],
    map?: boolean
  ): Promise<Answer> {
    const answer = (await findOne(
      this.answerRepository,
      "answer",
      key,
      value
    )) as Answer;

    // check if answer exists
    if (!answer) throw new NotFoundException("Answer with given id not found.");

    // check if exam belongs to user or user owns answer sheet
    const answerSheet = await (await answer.sectionToAnswerSheet).answerSheet;
    const exam = await answerSheet.exam;
    if (
      userId !== (await exam.createdBy).id &&
      userId !== (await answerSheet.user).id
    )
      throw new UnauthorizedException(
        "You are not authorized to access this answer."
      );

    return (await findOne(
      this.answerRepository,
      "answer",
      key,
      value,
      relations,
      map
    )) as Answer;
  }

  /** custom methods */
  async createBatch(
    userId: number,
    sasId: number,
    createAnswerDto: CreateAnswerDto[]
  ): Promise<Answer[]> {
    // for each answerDto in the batch, create it
    const answers: Answer[] = [];
    for (const answer of createAnswerDto) {
      answers.push(await this.create(userId, sasId, answer));
    }
    return answers;
  }

  async getQuestion(
    userId: number,
    answerId: number
  ): Promise<Partial<Question>> {
    // check if answer exists and user is authorized to access it
    const answer = await this.findOne(userId, "id", answerId);

    const { statement, options, type } = (await this.questionService.findOne(
      new ObjectId(answer.questionRef)
    )) as Question;

    // return partial question
    return { statement, options, type };
  }

  async submit(
    userId: number,
    answerId: number,
    updateAnswerDto: UpdateAnswerDto,
    file?: Express.Multer.File
  ): Promise<Answer> {
    // check if answer exists and user is authorized to update it
    const answer = await this.findOne(userId, "id", answerId);

    // check if sectionToAnswerSheet is already closed
    if ((await answer.sectionToAnswerSheet).endDate)
      throw new BadRequestException("Section is already closed.");

    // upload file local storage or s3 bucket
    if (file) {
      const nodeEnv = this.configService.get<string>("NODE_ENV");
      const filePath = path.join(
        __dirname,
        `../../answers/${answer.questionRef}/${answerId}.zip`
      );

      if (nodeEnv === "dev") {
        const dirPath = path.dirname(filePath);
        await fs.promises.mkdir(dirPath, { recursive: true });
        await fs.promises.writeFile(filePath, file.buffer);
      } else if (nodeEnv === "prod") {
        const s3Key = `answers/${answer.questionRef}/${answerId}.zip`;
        await this.awsService.uploadFileToS3(s3Key, file);
      }
    }

    // update answer
    await update(
      answerId,
      updateAnswerDto as unknown as Record<string, unknown>,
      this.answerRepository,
      "answer"
    );

    return <Answer>await this.findOne(userId, "id", answerId);
  }

  async submitAndCloseSection(
    userId: number,
    answerId: number,
    submitAnswersDto: SubmitAnswersDto,
    file?: Express.Multer.File
  ): Promise<Answer> {
    // get sectionToAnswerSheetService from moduleRef
    this.sasService =
      this.sasService ??
      this.moduleRef.get(SectionToAnswerSheetService, {
        strict: false,
      });

    // update answer with submitted content
    const answer = await this.submit(
      userId,
      answerId,
      {
        content: submitAnswersDto.content,
      },
      file
    );

    // proctoring variables for keyboard and mouse
    const nodeEnv = this.configService.get<string>("NODE_ENV");
    const answerSheetId = (await answer.sectionToAnswerSheet).id;
    const s3Key = `proctoring/${userId}/${answerSheetId}`;
    const dirPath = path.join(
      __dirname,
      `../../proctoring/${userId}/${answerSheetId}`
    );

    // write keyboard data to local storage or s3 bucket
    if (submitAnswersDto.keyboard) {
      const keyboardBuffer = Buffer.from(
        JSON.stringify(submitAnswersDto.keyboard)
      );

      if (nodeEnv === "dev") {
        await fs.promises.mkdir(dirPath, { recursive: true });
        await fs.promises.writeFile(`${dirPath}/keyboard.txt`, keyboardBuffer);
      } else if (nodeEnv === "prod") {
        await this.awsService.uploadFileToS3(`${s3Key}/keyboard.txt`, {
          buffer: keyboardBuffer,
          mimetype: "text/plain",
        } as Express.Multer.File);
      }
    }

    // write mouse data to local storage or s3 bucket
    if (submitAnswersDto.mouse) {
      const mouseBuffer = Buffer.from(JSON.stringify(submitAnswersDto.mouse));

      if (nodeEnv === "dev") {
        await fs.promises.writeFile(`${dirPath}/mouse.txt`, mouseBuffer);
      } else if (nodeEnv === "prod") {
        await this.awsService.uploadFileToS3(`${s3Key}/mouse.txt`, {
          buffer: mouseBuffer,
          mimetype: "text/plain",
        } as Express.Multer.File);
      }
    }

    // update sectionToAnswerSheet with end date
    const sasId = (await answer.sectionToAnswerSheet).id;
    await this.sasService.submit(userId, sasId);

    return answer;
  }

  async generateEval(userId: number, answerId: number): Promise<any> {
    // check if answer exists and user is authorized to access it
    const answer = await this.findOne(userId, "id", answerId);

    // fetch grading rubric, statement and type from question
    const { gradingRubric, statement, type } =
      (await this.questionService.findOne(new ObjectId(answer.questionRef)))!;

    // if question is of type multipleChoice, evaluate it objectively
    if (type === "multipleChoice")
      await this.answerRepository.update(
        { id: answerId },
        {
          aiScore:
            answer.content ===
            new String(
              (gradingRubric as MultipleChoiceGradingCriteria).answer.option
            ).trim()
              ? 1
              : 0,
        }
      );

    // if question is of type text, programming or challenge, evaluate using AI
    if (type !== "multipleChoice") {
      let maxScore: number = 0;
      let aiScore: number = 0;
      let aiFeedback: string = "";

      let content = answer.content;
      if (type === "challenge") {
        const answerSheetId = (await answer.sectionToAnswerSheet).id;
        const zip = await this.awsService.fetchUnzippedDocumentary(
          answer.questionRef,
          answerSheetId
        );
        const documentaryContent = zip.documentaryContent;
        content = JSON.stringify(documentaryContent);
      }

      const model =
        type === "challenge" ? "gpt-3.5-turbo-16k" : "gpt-3.5-turbo";

      const langModel = this.naturalLanguageService.createLanguageModel(model);

      const schema = fs.readFileSync(
        path.join(__dirname, "../../src/nlp/schema/answer.schema.ts"),
        "utf-8"
      );

      const translator = this.naturalLanguageService.createJsonTranslator(
        langModel,
        schema,
        "AnswerSchema"
      );

      for (const rubric of Object.values(gradingRubric)) {
        maxScore += rubric.criteria.total_points;

        const { data }: any = getData(
          await translator.translate(content, "eval", statement, rubric)
        );

        if (data.type === "unprocessable") {
          aiFeedback += `${rubric.criteria.title}: ${data.reason}\n\n`;
          continue;
        }

        aiScore += data.grade;
        aiFeedback += `${rubric.criteria.title}: ${data.feedback}\n\n`;
      }

      // update answer with aiScore
      await this.answerRepository.update(
        { id: answerId },
        { aiScore: aiScore / maxScore }
      );

      // update answer with aiFeedback
      await this.answerRepository.update({ id: answerId }, { aiFeedback });
    }

    // return updated answer
    return await this.findOne(userId, "id", answerId);
  }
}
