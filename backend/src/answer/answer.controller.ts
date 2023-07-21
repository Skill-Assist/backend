/** nestjs */
import {
  Req,
  Get,
  Body,
  Patch,
  Query,
  Controller,
  UploadedFile,
  UseInterceptors,
  ClassSerializerInterceptor,
  UnprocessableEntityException,
} from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { FileInterceptor } from "@nestjs/platform-express";

/** providers */
import { AnswerService } from "./answer.service";

/** entities & schemas */
import { Answer } from "./entities/answer.entity";
import { UserRole } from "../user/entities/user.entity";
import { Question } from "../question/schemas/question.schema";

/** dtos */
import { UpdateAnswerDto } from "./dto/update-answer.dto";
import { SubmitAnswersDto } from "./dto/submit-answers.dto";

/** decorators */
import { Roles } from "../auth/decorators/roles.decorator";

/** external dependencies */
import { Express } from "express";

/** utils */
import { PassportRequest } from "../utils/types.utils";
////////////////////////////////////////////////////////////////////////////////

@ApiTags("answer")
@UseInterceptors(ClassSerializerInterceptor)
@Controller("answer")
export class AnswerController {
  constructor(private readonly answerService: AnswerService) {}

  /** basic CRUD endpoints */
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
  @Get("getQuestion")
  getQuestion(
    @Req() req: PassportRequest,
    @Query("id") id: number
  ): Promise<Partial<Question>> {
    return this.answerService.getQuestion(req.user!.id, id);
  }

  @Patch("submit")
  @UseInterceptors(FileInterceptor("file"))
  @Roles(UserRole.CANDIDATE)
  submit(
    @Req() req: PassportRequest,
    @Query("id") id: number,
    @Body() updateAnswerDto: UpdateAnswerDto,
    @UploadedFile()
    file?: Express.Multer.File
  ): Promise<Answer> {
    if (
      file &&
      (!["application/zip", "application/x-zip-compressed"].includes(
        file?.mimetype
      ) ||
        file?.size > 10 * 1024 * 1024)
    )
      throw new UnprocessableEntityException(
        "File must be a zip file and less than 10MB"
      );

    return this.answerService.submit(req.user!.id, id, updateAnswerDto, file);
  }

  @Patch("submitAndCloseSection")
  @UseInterceptors(FileInterceptor("file"))
  @Roles(UserRole.CANDIDATE)
  submitAndCloseSection(
    @Req() req: PassportRequest,
    @Query("id") id: number,
    @Body() submitAnswersDto: SubmitAnswersDto,
    @UploadedFile()
    file?: Express.Multer.File
  ): Promise<Answer> {
    if (
      file &&
      (!["application/zip", "application/x-zip-compressed"].includes(
        file?.mimetype
      ) ||
        file?.size > 10 * 1024 * 1024)
    )
      throw new UnprocessableEntityException(
        "File must be a zip file and less than 10MB"
      );

    return this.answerService.submitAndCloseSection(
      req.user!.id,
      id,
      submitAnswersDto,
      file
    );
  }

  @Get("generateEval")
  @Roles(UserRole.RECRUITER)
  generateEval(
    @Req() req: PassportRequest,
    @Query("id") id: number
  ): Promise<Answer> {
    return this.answerService.generateEval(req.user!.id, id);
  }
}
