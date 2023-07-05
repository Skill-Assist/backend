/** nestjs */
import {
  Get,
  Body,
  Post,
  Patch,
  Param,
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
import { UpdateAnswerAndCloseSectionDto } from "./dto/update-answer-and-close-section.dto";

/** utils */
import { UserRole } from "../user/entities/user.entity";
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
    @Query("sectionToAnswerSheetId") sectionToAnswerSheetId: number,
    @Body() createAnswerDto: CreateAnswerDto
  ): Promise<Answer> {
    return this.answerService.create(sectionToAnswerSheetId, createAnswerDto);
  }

  @Get()
  findAll(
    @Query("key") key: string,
    @Query("value") value: unknown,
    @Query("relations") relations: string
  ): Promise<Answer[]> {
    return this.answerService.findAll(
      key,
      value,
      relations ? relations.split(",") : undefined
    );
  }

  @Get("findOne")
  findOne(
    @Query("key") key: string,
    @Query("value") value: unknown,
    @Query("relations") relations: string
  ): Promise<Answer | null> {
    return this.answerService.findOne(
      key,
      value,
      relations ? relations.split(",") : undefined
    );
  }

  /** custom endpoints */
  @Patch("submit")
  @Roles(UserRole.CANDIDATE)
  submit(
    @Query("id") id: number,
    @Body() updateAnswerDto: UpdateAnswerDto
  ): Promise<Answer> {
    return this.answerService.submit(id, updateAnswerDto);
  }

  @Post("batch")
  @Roles(UserRole.CANDIDATE)
  createBatch(
    @Query("sectionToAnswerSheetId") sectionToAnswerSheetId: number,
    @Body() createAnswerDto: CreateAnswerDto[]
  ): Promise<Answer[]> {
    return this.answerService.createBatch(
      sectionToAnswerSheetId,
      createAnswerDto
    );
  }

  @Get("generateEval/:id")
  generateResponse(@Param("id") id: number): Promise<Answer> {
    return this.answerService.generateEval(id);
  }

  @Get("question/:id")
  @Roles(UserRole.CANDIDATE)
  getQuestion(@Param("id") id: number): Promise<any> {
    return this.answerService.getQuestion(id);
  }

  @Patch("close-section/:id")
  @Roles(UserRole.CANDIDATE)
  closeSection(
    @Param("id") id: number,
    @Body() updateAnswerAndCloseSectionDto: UpdateAnswerAndCloseSectionDto
  ): Promise<string> {
    return this.answerService.submitAndCloseSection(
      id,
      updateAnswerAndCloseSectionDto
    );
  }
}
