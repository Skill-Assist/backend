/** nestjs */
import {
  Injectable,
  NotFoundException,
  BadRequestException,
  UnauthorizedException,
} from "@nestjs/common";
import { ModuleRef } from "@nestjs/core";
import { InjectRepository } from "@nestjs/typeorm";

/** providers */
import { AwsService } from "../aws/aws.service";
import { OpenaiService } from "../openai/openai.service";
import { QuestionService } from "../question/question.service";
import { QueryRunnerService } from "../query-runner/query-runner.service";
import { SectionToAnswerSheetService } from "../section-to-answer-sheet/section-to-answer-sheet.service";

/** external dependencies */
import { ObjectId } from "mongodb";
import { Repository } from "typeorm";

/** entities & schemas */
import { Answer } from "./entities/answer.entity";
import { Question } from "../question/schemas/question.schema";

/** dtos */
import { CreateAnswerDto } from "./dto/create-answer.dto";
import { UpdateAnswerDto } from "./dto/update-answer.dto";

/** utils */
import { GradingRubric } from "../utils/types.utils";
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
    private readonly openaiService: OpenaiService,
    private readonly queryRunner: QueryRunnerService,
    private readonly questionService: QuestionService
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

  async update(
    userId: number,
    answerId: number,
    updateAnswerDto: UpdateAnswerDto
  ): Promise<Answer> {
    // check if answer exists and user is authorized to update it
    await this.findOne(userId, "id", answerId);

    // update answer
    await update(
      answerId,
      updateAnswerDto as unknown as Record<string, unknown>,
      this.answerRepository,
      "answer"
    );

    return <Answer>await this.findOne(userId, "id", answerId);
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
    const answer = await this.findOne(userId, "id", answerId, [
      "sectionToAnswerSheet",
    ]);

    // check if sectionToAnswerSheet is already closed
    if ((await answer.sectionToAnswerSheet).endDate)
      throw new BadRequestException("Section is already closed.");

    // upload file to s3 bucket
    if (file)
      await this.awsService.uploadFileToS3(
        `answers/${answer.questionRef}/${answerId}/archive.zip`,
        file
      );

    // update answer
    return await this.update(userId, answerId, updateAnswerDto);
  }

  async submitAndCloseSection(
    userId: number,
    answerId: number,
    updateAnswerDto: UpdateAnswerDto,
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
        content: updateAnswerDto.content,
      },
      file
    );

    // write keyboard proctoring data to s3 bucket
    await this.awsService.uploadFileToS3(
      `proctoring/${answer.questionRef}/${answerId}/keyboard.txt`,
      {
        buffer: Buffer.from(JSON.stringify(updateAnswerDto.keyboard)),
        mimetype: "text/plain",
      } as Express.Multer.File
    );

    // write mouse data to file
    await this.awsService.uploadFileToS3(
      `proctoring/${answer.questionRef}/${answerId}/mouse.txt`,
      {
        buffer: Buffer.from(JSON.stringify(updateAnswerDto.mouse)),
        mimetype: "text/plain",
      } as Express.Multer.File
    );

    // update sectionToAnswerSheet with end date
    const sasId = (await answer.sectionToAnswerSheet).id;
    await this.sasService.submit(userId, sasId);

    return answer;
  }

  async generateEval(userId: number, answerId: number): Promise<Answer> {
    const answer = await this.findOne(userId, "id", answerId);

    const { gradingRubric, statement, type } =
      (await this.questionService.findOne(
        new ObjectId(answer.questionRef)
      )) as Question;

    if (type === "multipleChoice") {
      await this.answerRepository.update(
        { id: answerId },
        {
          aiScore:
            answer.content === new String(gradingRubric.answer.option).trim()
              ? 1
              : 0,
        }
      );
    } else {
      let maxScore: number = 0;
      let aiScore: number = 0;
      let aiFeedback: string = "";

      for (const rubric of Object.values(gradingRubric))
        maxScore = maxScore + +Object.entries(rubric)[0][1];

      const generatedEval = await this.openaiService.createChatCompletion(
        statement,
        gradingRubric as GradingRubric,
        type === "challenge"
          ? JSON.stringify(
              (
                await this.awsService.fetchUnzippedDocumentary(answer.content)
              ).documentaryContent
            )
          : answer.content,
        type === "challenge" ? "gpt-3.5-turbo-16k" : "gpt-3.5-turbo"
      );

      for (const key in generatedEval) {
        const content = generatedEval[key].choices[0].message?.content;

        const scoreRegex: RegExp = /Nota: (\d+)/;
        const scoreMatch: RegExpMatchArray | null = content!.match(scoreRegex);
        if (scoreMatch) aiScore += parseInt(scoreMatch[1]);

        const feedbackRegex: RegExp = /Feedback: (.+)/;
        const feedbackMatch: RegExpMatchArray | null =
          content!.match(feedbackRegex);
        if (feedbackMatch) aiFeedback += `${key}: ${feedbackMatch[1]}\n\n`;
      }

      // update answer with aiScore
      await this.update(userId, answerId, { aiScore: aiScore / maxScore });

      // update answer with aiFeedback
      await this.update(userId, answerId, { aiFeedback });
    }

    // return updated answer
    return await this.findOne(userId, "id", answerId);
  }
}
