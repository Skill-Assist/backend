/** nestjs */
import {
  Injectable,
  NotFoundException,
  BadRequestException,
  UnauthorizedException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";

/** providers */
import { UserService } from "../user/user.service";
import { SectionService } from "../section/section.service";

/** external dependencies */
import { Model } from "mongoose";
import { ObjectId } from "mongodb";

/** schemas & dtos */
import { Question } from "./schemas/question.schema";
import { CreateQuestionDto } from "./dto/create-question.dto";
////////////////////////////////////////////////////////////////////////////////

@Injectable()
export class QuestionService {
  constructor(
    @InjectModel(Question.name)
    private readonly questionModel: Model<Question>,
    private readonly userService: UserService,
    private readonly sectionService: SectionService
  ) {}

  /** basic CRUD methods */
  async create(
    createQuestionDto: CreateQuestionDto,
    userId: number,
    sectionId?: number,
    weight?: number
  ): Promise<Question> {
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

    // if sectionId is provided, check if weight is provided
    if (sectionId && !weight)
      throw new UnauthorizedException(
        "You must provide the relative weight this question will be worth in the current section."
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

    // add relationship between section and question
    this.sectionService.addtoQuestion(sectionId, {
      questionId: [{ id: questionId, weight }],
    });

    // add relationship between question and section
    return (await this.questionModel.findByIdAndUpdate(
      questionId,
      { sections: [...question.sections, sectionId] },
      { new: true }
    ))!;
  }
}
