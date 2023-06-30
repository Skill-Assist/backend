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

  async create(
    createQuestionDto: CreateQuestionDto,
    userId: number,
    sectionId?: number
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

    try {
      // create new question and add relationship with user
      const newQuestion = await this.questionModel.create({
        ...createQuestionDto,
        createdBy: userId,
      });

      // add relationship with user
      const user = await this.userService.findOne("id", userId);

      const ownedQuestions =
        user!.ownedQuestions === null
          ? [newQuestion._id]
          : [...user!.ownedQuestions, newQuestion._id];

      this.userService.addQuestion(userId, { ownedQuestions });

      // add relationship with section if sectionId is provided
      return sectionId
        ? await this.addToSection(newQuestion._id, sectionId)
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

  async addToSection(
    questionId: ObjectId,
    sectionId: number
  ): Promise<Question> {
    // check if question exists
    const question = await this.findOne(questionId);
    if (!question) throw new NotFoundException("Question not found.");

    // check if section exists
    const section = await this.sectionService.findOne("id", sectionId);
    if (!section) throw new NotFoundException("Section not found.");

    // add relationship between section and question
    this.sectionService.addtoQuestion(sectionId, {
      questionId: [...section.questionId, questionId],
    });

    // add relationship between question and section
    const updatedQuestion: Question | null =
      await this.questionModel.findByIdAndUpdate(
        questionId,
        {
          sections: [...question.sections, sectionId],
        },
        { new: true }
      );
    return updatedQuestion!;
  }
}
