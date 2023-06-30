/** nestjs */
import {
  Injectable,
  NotFoundException,
  BadRequestException,
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
import { ChatCompletionResponse } from "../openai/openai.service";

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
    sasId: number,
    createAnswerDto: CreateAnswerDto
  ): Promise<Answer> {
    // get sectionToAnswerSheetService from moduleRef
    this.sasService = this.moduleRef.get(SectionToAnswerSheetService, {
      strict: false,
    });

    // check if sectionToAnswerSheet exists
    const sectionToAnswerSheet = await this.sasService.findOne("id", sasId);
    if (!sectionToAnswerSheet)
      throw new NotFoundException("Section to Answer Sheet not found.");

    // check if question exists
    const question = await this.questionService.findOne(
      new ObjectId(createAnswerDto.questionRef)
    );
    if (!question) throw new NotFoundException("Question not found.");

    // check if question belong to section
    if (
      !(await sectionToAnswerSheet.section).questionId.includes(
        createAnswerDto.questionRef
      )
    )
      throw new BadRequestException(
        "Question is not in the section to answer sheet."
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
    return <Answer>await this.findOne("id", answer.id);
  }

  async findAll(
    key?: string,
    value?: unknown,
    relations?: string[]
  ): Promise<Answer[]> {
    if (key && !value) throw new NotFoundException("Value not provided.");

    return (await findAll(
      this.answerRepository,
      "answer",
      key,
      value,
      relations
    )) as Answer[];
  }

  async findOne(
    key: string,
    value: unknown,
    relations?: string[]
  ): Promise<Answer | null> {
    if (key && !value) throw new NotFoundException("Value not provided.");

    return (await findOne(
      this.answerRepository,
      "answer",
      key,
      value,
      relations
    )) as Answer;
  }

  async update(id: number, updateAnswerDto: UpdateAnswerDto): Promise<Answer> {
    await update(
      id,
      updateAnswerDto as unknown as Record<string, unknown>,
      this.answerRepository,
      "answer"
    );

    return <Answer>await this.findOne("id", id);
  }

  /** custom methods */
  async submit(id: number, updateAnswerDto: UpdateAnswerDto): Promise<Answer> {
    // check if answer exists
    const answer = await this.findOne("id", id, ["sectionToAnswerSheet"]);
    if (!answer) throw new NotFoundException("Answer not found.");

    // check if sectionToAnswerSheet is already closed
    if (!(await answer.sectionToAnswerSheet).endDate)
      throw new BadRequestException("Section is already closed.");

    // update answer
    return await this.update(id, updateAnswerDto);
  }

  async createBatch(
    sasId: number,
    createAnswerDto: CreateAnswerDto[]
  ): Promise<Answer[]> {
    // for each answerDto in the batch, create it
    const answers: Answer[] = [];
    for (const answer of createAnswerDto) {
      answers.push(await this.create(sasId, answer));
    }
    return answers;
  }

  async getAiFeedback(id: number): Promise<ChatCompletionResponse> {
    const answer: Answer | null = await this.findOne("id", id);
    if (!answer) throw new NotFoundException("Answer not found.");

    const question: Question | null = await this.questionService.findOne(
      new ObjectId(answer.questionRef)
    );
    if (!question) throw new NotFoundException("Question not found.");

    return await this.openaiService.createChatCompletion(
      question.statement,
      question.gradingRubric,
      answer.content
    );
  }

  async getQuestion(answerId: number): Promise<Partial<Question>> {
    // try to find answer by id and throw error if not found
    const answer = await this.findOne("id", answerId);
    if (!answer) throw new NotFoundException("Answer not found.");

    // try to find question by id and throw error if not found
    const question = await this.questionService.findOne(
      new ObjectId(answer.questionRef)
    );
    if (!question) throw new NotFoundException("Question not found.");

    // return question without grading rubric
    return {
      statement: question.statement,
      options: question.options,
      type: question.type,
    };
  }

  async closeSection(
    answerId: number,
    updateAnswerAndCloseSectionDto: UpdateAnswerAndCloseSectionDto
  ): Promise<string> {
    // get sectionToAnswerSheetService from moduleRef
    this.sasService = this.moduleRef.get(SectionToAnswerSheetService, {
      strict: false,
    });

    // update answer with provided data
    const answer: Answer = await this.update(answerId, {
      content: updateAnswerAndCloseSectionDto.content,
    });

    // update sectionToAnswerSheet with end date
    const _id = (await answer.sectionToAnswerSheet).id;
    await this.sasService.update(_id, { endDate: new Date() });

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
}
