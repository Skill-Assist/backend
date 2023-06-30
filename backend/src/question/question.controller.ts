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
////////////////////////////////////////////////////////////////////////////////

@ApiTags("question")
@Controller("question")
export class QuestionController {
  constructor(private readonly questionService: QuestionService) {}

  @Post()
  create(
    @Req() req: PassportRequest,
    @Body() createQuestionDto: CreateQuestionDto,
    @Query("sectionId") sectionId?: number
  ): Promise<Question> {
    return this.questionService.create(
      createQuestionDto,
      req.user!.id,
      sectionId
    );
  }

  @Get()
  findAll(): Promise<Question[]> {
    return this.questionService.findAll();
  }

  @Get(":id")
  findOne(@Param("id") id: ObjectId): any {
    return this.questionService.findOne(id);
  }
}
