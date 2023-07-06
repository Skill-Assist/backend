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
import { QuestionService } from "../question/question.service";
import { QueryRunnerFactory } from "../utils/query-runner.factory";
import { SectionToAnswerSheetService } from "../section-to-answer-sheet/section-to-answer-sheet.service";

/** external dependencies */
import * as path from "path";
import { ObjectId } from "mongodb";
import { promises as fs } from "fs";
import { Repository } from "typeorm";

/** entities & dtos */
import { Answer } from "./entities/answer.entity";
import { CreateAnswerDto } from "./dto/create-answer.dto";
import { UpdateAnswerDto } from "./dto/update-answer.dto";
import { Question } from "../question/schemas/question.schema";
import { UpdateAnswerAndCloseSectionDto } from "./dto/update-answer-and-close-section.dto";

/** OpenAI API */
import { OpenaiService } from "../openai/openai.service";

/** utils */
import { create, findOne, findAll, update } from "../utils/typeorm.utils";
////////////////////////////////////////////////////////////////////////////////

@Injectable()
export class AnswerService {
  private sasService: SectionToAnswerSheetService;

  constructor(
    @InjectRepository(Answer)
    private readonly answerRepository: Repository<Answer>,
    private readonly moduleRef: ModuleRef,
    private readonly openaiService: OpenaiService,
    private readonly queryRunner: QueryRunnerFactory,
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

    // prettier-ignore
    // check if exam belongs to user or user is enrolled in exam
    const exam = await (
      await (await answer.sectionToAnswerSheet).answerSheet
    ).exam;

    if (
      userId !== (await exam.createdBy).id &&
      !(await exam.enrolledUsers).some((candidate) => candidate.id === userId)
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
    // check if answer exists
    const answer = await this.findOne(userId, "id", answerId);

    // check if question exists
    const { statement, options, type } = (await this.questionService.findOne(
      new ObjectId(answer.questionRef)
    )) as Question;

    // return partial question
    return { statement, options, type };
  }

  async submit(
    userId: number,
    answerId: number,
    updateAnswerDto: UpdateAnswerDto
  ): Promise<Answer> {
    // check if answer exists and user is authorized to update it
    const answer = await this.findOne(userId, "id", answerId, [
      "sectionToAnswerSheet",
    ]);

    // check if sectionToAnswerSheet is already closed
    if ((await answer.sectionToAnswerSheet).endDate)
      throw new BadRequestException("Section is already closed.");

    // update answer
    return await this.update(userId, answerId, updateAnswerDto);
  }

  async submitAndCloseSection(
    userId: number,
    answerId: number,
    updateAnswerAndCloseSectionDto: UpdateAnswerAndCloseSectionDto
  ): Promise<string> {
    // get sectionToAnswerSheetService from moduleRef
    this.sasService =
      this.sasService ??
      this.moduleRef.get(SectionToAnswerSheetService, {
        strict: false,
      });

    // update answer with provided data
    const answer: Answer = await this.update(userId, answerId, {
      content: updateAnswerAndCloseSectionDto.content,
    });

    // update sectionToAnswerSheet with end date
    const _id = (await answer.sectionToAnswerSheet).id;
    await this.sasService.update(userId, _id, { endDate: new Date() });

    // write keyboard data to file
    await fs.appendFile(
      path.join(`${__dirname}/../..`, "proctoring", "keyboard.txt"),
      JSON.stringify(updateAnswerAndCloseSectionDto.keyboard)
    );

    // write mouse data to file
    await fs.appendFile(
      path.join(`${__dirname}/../..`, "proctoring", "mouse.txt"),
      JSON.stringify(updateAnswerAndCloseSectionDto.mouse)
    );

    return `Section ${_id} closed successfully at ${new Date()}.`;
  }

  async generateEval(userId: number, answerId: number): Promise<Answer> {
    const answer = await this.findOne(userId, "id", answerId);

    const { gradingRubric, statement, type } =
      (await this.questionService.findOne(
        new ObjectId(answer.questionRef)
      )) as Question;

    let maxScore: number = 0;
    for (const rubric of Object.values(gradingRubric)) {
      maxScore += (rubric["pontos totais"] as Number).valueOf();
    }

    const generatedEval = await this.openaiService.createChatCompletion(
      statement,
      gradingRubric,
      type === "challenge"
        ? JSON.stringify(
            (
              await this.openaiService.fetchUnzippedDocumentary(answer.content)
            ).documentaryContent
          )
        : answer.content,
      type === "challenge" ? "gpt-3.5-turbo-16k" : "gpt-3.5-turbo"
    );

    let aiScore: number = 0;
    let aiFeedback: string = "";
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
    await this.answerRepository.update(
      { id: answerId },
      { aiScore: (aiScore / maxScore) * 10 }
    );

    // update answer with aiFeedback
    await this.answerRepository.update({ id: answerId }, { aiFeedback });

    // return updated answer
    return await this.findOne(userId, "id", answerId);
  }
}
