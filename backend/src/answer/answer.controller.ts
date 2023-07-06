/** nestjs */
import {
  Req,
  Get,
  Body,
  Post,
  Patch,
  Query,
  Controller,
  UseInterceptors,
  ClassSerializerInterceptor,
} from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";

/** providers */
import { AnswerService } from "./answer.service";

/** entities & dtos */
import { Answer } from "./entities/answer.entity";
import { CreateAnswerDto } from "./dto/create-answer.dto";
import { UpdateAnswerDto } from "./dto/update-answer.dto";
import { Question } from "../question/schemas/question.schema";
import { UpdateAnswerAndCloseSectionDto } from "./dto/update-answer-and-close-section.dto";

/** utils */
import { UserRole } from "../user/entities/user.entity";
import { PassportRequest } from "../auth/auth.controller";
import { Roles } from "../user/decorators/roles.decorator";
////////////////////////////////////////////////////////////////////////////////

@ApiTags("answer")
@UseInterceptors(ClassSerializerInterceptor)
@Controller("answer")
export class AnswerController {
  constructor(private readonly answerService: AnswerService) {}

  /** basic CRUD endpoints */
  @Post()
  @Roles(UserRole.CANDIDATE)
  create(
    @Req() req: PassportRequest,
    @Query("sectionToAnswerSheetId") sectionToAnswerSheetId: number,
    @Body() createAnswerDto: CreateAnswerDto
  ): Promise<Answer> {
    return this.answerService.create(
      req.user!.id,
      sectionToAnswerSheetId,
      createAnswerDto
    );
  }

  @Get()
  @Roles(UserRole.ADMIN)
  findAll(
    @Query("key") key: string,
    @Query("value") value: unknown,
    @Query("relations") relations: string,
    @Query("map") map: boolean
  ): Promise<Answer[]> {
    return this.answerService.findAll(
      key,
      value,
      relations ? relations.split(",") : undefined,
      map
    );
  }

  @Get("findOne")
  findOne(
    @Req() req: PassportRequest,
    @Query("key") key: string,
    @Query("value") value: unknown,
    @Query("relations") relations: string,
    @Query("map") map: boolean
  ): Promise<Answer> {
    return this.answerService.findOne(
      req.user!.id,
      key,
      value,
      relations ? relations.split(",") : undefined,
      map
    );
  }

  /** custom endpoints */
  @Post("batch")
  @Roles(UserRole.CANDIDATE)
  createBatch(
    @Req() req: PassportRequest,
    @Query("sectionToAnswerSheetId") sectionToAnswerSheetId: number,
    @Body() createAnswerDto: CreateAnswerDto[]
  ): Promise<Answer[]> {
    return this.answerService.createBatch(
      req.user!.id,
      sectionToAnswerSheetId,
      createAnswerDto
    );
  }

  @Get("getQuestion")
  getQuestion(
    @Req() req: PassportRequest,
    @Query("id") id: number
  ): Promise<Partial<Question>> {
    return this.answerService.getQuestion(req.user!.id, id);
  }

  @Patch("submit")
  @Roles(UserRole.CANDIDATE)
  submit(
    @Req() req: PassportRequest,
    @Query("id") id: number,
    @Body() updateAnswerDto: UpdateAnswerDto
  ): Promise<Answer> {
    return this.answerService.submit(req.user!.id, id, updateAnswerDto);
  }

  @Patch("closeSection")
  @Roles(UserRole.CANDIDATE)
  closeSection(
    @Req() req: PassportRequest,
    @Query("id") id: number,
    @Body() updateAnswerAndCloseSectionDto: UpdateAnswerAndCloseSectionDto
  ): Promise<string> {
    return this.answerService.submitAndCloseSection(
      req.user!.id,
      id,
      updateAnswerAndCloseSectionDto
    );
  }

  @Get("generateEval")
  @Roles(UserRole.RECRUITER)
  generateResponse(
    @Req() req: PassportRequest,
    @Query("id") id: number
  ): Promise<Answer> {
    return this.answerService.generateEval(req.user!.id, id);
  }
}
