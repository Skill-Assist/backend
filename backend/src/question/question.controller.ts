/** nestjs */
import { Controller, Req, Get, Post, Body, Query } from "@nestjs/common";

/** providers */
import { QuestionService } from "./question.service";

/** external dependencies */
import { ObjectId } from "mongodb";

/** schemas */
import { Question } from "./schemas/question.schema";

/** dtos */
import { CreateQuestionDto } from "./dto/create-question.dto";

/** utils */
import { PassportRequest } from "../utils/api-types.utils";
import { GenerateQuestionDto } from "./dto/generate-question.dto";
////////////////////////////////////////////////////////////////////////////////

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
  findAll(): Promise<Question[]> {
    return this.questionService.findAll();
  }

  @Get("findOne")
  findOne(@Query("id") id: ObjectId): Promise<Question | null> {
    return this.questionService.findOne(id);
  }

  /** custom endpoints */
  @Get("fetchOwn")
  fetchOwn(@Req() req: PassportRequest): Promise<Question[]> {
    return this.questionService.fetchOwn(req.user!.id);
  }

  @Post("generate")
  generate(@Body() generateQuestionDto: GenerateQuestionDto): Promise<any> {
    return this.questionService.generate(generateQuestionDto);
  }
}
