/** nestjs */
import { ApiTags } from "@nestjs/swagger";
import { Controller, Req, Get, Post, Body, Query } from "@nestjs/common";

/** providers */
import { QuestionService } from "./question.service";

/** external dependencies */
import { ObjectId } from "mongodb";

/** schemas & dtos */
import { Question } from "./schemas/question.schema";
import { CreateQuestionDto } from "./dto/create-question.dto";

/** utils */
import { PassportRequest } from "../auth/auth.controller";
import { Roles } from "../user/decorators/roles.decorator";
import { UserRole } from "../user/entities/user.entity";
////////////////////////////////////////////////////////////////////////////////

@ApiTags("question")
@Controller("question")
export class QuestionController {
  constructor(private readonly questionService: QuestionService) {}

  /** basic CRUD endpoints */
  @Post()
  create(
    @Req() req: PassportRequest,
    @Body() createQuestionDto: CreateQuestionDto,
    @Query("sectionId") sectionId?: number,
    @Query("weight") weight?: number
  ): Promise<Question> {
    return this.questionService.create(
      createQuestionDto,
      req.user!.id,
      sectionId,
      weight
    );
  }

  @Get()
  @Roles(UserRole.ADMIN)
  findAll(): Promise<Question[]> {
    return this.questionService.findAll();
  }

  @Get("findOne")
  findOne(@Query("id") id: ObjectId): Promise<Question | null> {
    return this.questionService.findOne(id);
  }

  /** custom endpoints */
  @Get("fetchOwnQuestions")
  fetchOwnQuestions(@Req() req: PassportRequest): Promise<Question[]> {
    return this.questionService.fetchOwnQuestions(req.user!.id);
  }
}
