/** nestjs */
import { ApiTags } from "@nestjs/swagger";
import { Controller, Req, Get, Post, Body, Param, Query } from "@nestjs/common";

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

  @Get(":id")
  findOne(@Param("id") id: ObjectId): any {
    return this.questionService.findOne(id);
  }
}
