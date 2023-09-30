/** nestjs */
import {
  Injectable,
  NotFoundException,
  BadRequestException,
  UnauthorizedException,
} from "@nestjs/common";
import { ModuleRef } from "@nestjs/core";
import { InjectModel } from "@nestjs/mongoose";

/** providers */
import { UserService } from "../user/user.service";
import { SectionService } from "../section/section.service";
import { NaturalLanguageService } from "../nlp/nlp.service";

/** external dependencies */
import * as fs from "fs";
import * as path from "path";
import { Model } from "mongoose";
import { ObjectId } from "mongodb";

/** schemas */
import { Question } from "./schemas/question.schema";

/** dtos */
import { CreateQuestionDto } from "./dto/create-question.dto";
import { GenerateQuestionDto } from "./dto/generate-question.dto";

/** utils */
import { TResult } from "../utils/nlp-types.utils";
////////////////////////////////////////////////////////////////////////////////

@Injectable()
export class QuestionService {
  private userService: UserService;

  constructor(
    @InjectModel(Question.name)
    private readonly questionModel: Model<Question>,
    private readonly moduleRef: ModuleRef,
    private readonly sectionService: SectionService,
    private readonly naturalLanguageService: NaturalLanguageService
  ) {}

  /** basic CRUD methods */
  async create(
    createQuestionDto: CreateQuestionDto,
    userId: number,
    sectionId?: number,
    weight?: number
  ): Promise<Question> {
    // get answerService from moduleRef
    this.userService =
      this.userService ??
      this.moduleRef.get<UserService>(UserService, {
        strict: false,
      });

    // if type is multipleChoice, check if there are at least 2 choices
    if (
      createQuestionDto.type === "multipleChoice" &&
      (!createQuestionDto.options ||
        Object.keys(createQuestionDto.options).length < 2)
    )
      throw new UnauthorizedException(
        "Multiple choice questions must have at least 2 choices."
      );

    // if sectionId is provided, check if user owns section
    if (sectionId) await this.sectionService.findOne(userId, "id", sectionId);

    // if sectionId is provided, check if weight is provided and is 1, 2 or 3
    if (sectionId && (!weight || ![1, 2, 3].includes(weight!)))
      throw new UnauthorizedException(
        "You must provide the weight this question will be worth in the current section. Allowed values are 1, 2 or 3."
      );

    try {
      // create new question with userId as createdBy
      const newQuestion = await this.questionModel.create({
        ...createQuestionDto,
        createdBy: userId,
      });

      // add relationship with user who created question
      const user = await this.userService.findOne("id", userId);

      const ownedQuestions =
        user!.ownedQuestions === null
          ? [newQuestion._id]
          : [...user!.ownedQuestions, newQuestion._id];

      this.userService.addQuestion(userId, { ownedQuestions });

      // add relationship with section if sectionId is provided
      return sectionId
        ? await this.addToSection(userId, newQuestion._id, sectionId, weight!)
        : newQuestion;
    } catch (err) {
      // throw error if question could not be created
      console.log(err.message);
      throw new UnauthorizedException(
        "An error occurred while creating question."
      );
    }
  }

  async findAll(): Promise<Question[]> {
    return await this.questionModel.find().exec();
  }

  async findOne(id: ObjectId): Promise<Question | null> {
    try {
      return await this.questionModel.findById(id).exec();
    } catch (err) {
      console.log(err.message);
      throw new BadRequestException("Invalid question id.");
    }
  }

  /** custom methods */
  async fetchOwn(userId: number): Promise<Question[]> {
    return await this.questionModel.find({ createdBy: userId });
  }

  async addToSection(
    userId: number,
    questionId: ObjectId,
    sectionId: number,
    weight: number
  ): Promise<Question> {
    // check if question exists
    const question = await this.findOne(questionId);
    if (!question) throw new NotFoundException("Question not found.");

    // check if section exists and is owned by user
    await this.sectionService.findOne(userId, "id", sectionId);

    // check if weight is 1, 2 or 3
    if (![1, 2, 3].includes(weight))
      throw new UnauthorizedException(
        "Allowed values for weight are 1, 2 or 3."
      );

    // add relationship between section and question
    const questions = (
      await this.sectionService.findOne(userId, "id", sectionId)
    ).questions;

    this.sectionService.addtoQuestion(sectionId, {
      questions: questions
        ? [...questions, { id: questionId, weight }]
        : [{ id: questionId, weight }],
    });

    // add relationship between question and section
    return (await this.questionModel.findByIdAndUpdate(
      questionId,
      { sections: [...question.sections, sectionId] },
      { new: true }
    ))!;
  }

  async generate(
    generateQuestionDto: GenerateQuestionDto
  ): Promise<TResult<object>> {
    const langModel = this.naturalLanguageService.createLanguageModel("gpt-4");

    const schema = fs.readFileSync(
      path.join(
        __dirname,
        `../../src/nlp/schema/${generateQuestionDto.type}-question.schema.ts`
      ),
      "utf8"
    );

    let typeName: string;
    switch (generateQuestionDto.type) {
      case "multiple-choice":
        typeName = "MultipleChoiceQuestionSchema";
        break;
      case "text":
        typeName = "TextQuestionSchema";
        break;
      case "programming":
        typeName = "ProgrammingQuestionSchema";
        break;
      case "challenge":
        typeName = "ChallengeQuestionSchema";
        break;
    }

    const translator = this.naturalLanguageService.createJsonTranslator(
      langModel,
      schema,
      typeName!
    );

    return await translator.translate(generateQuestionDto.prompt, "create");
  }
}
