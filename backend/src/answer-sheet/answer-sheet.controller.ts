/** nestjs */
import {
  Get,
  Req,
  Post,
  Patch,
  Query,
  Controller,
  UseInterceptors,
  ClassSerializerInterceptor,
} from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";

/** providers */
import { AnswerSheetService } from "./answer-sheet.service";

/** entities */
import { AnswerSheet } from "./entities/answer-sheet.entity";

/** utils */
import { UserRole } from "../user/entities/user.entity";
import { PassportRequest } from "../auth/auth.controller";
import { Roles } from "../user/decorators/roles.decorator";
import { ExpirationFlagInterceptor } from "./interceptors/expiration-flag.interceptor";
////////////////////////////////////////////////////////////////////////////////

ApiTags("answer-sheet");
@UseInterceptors(ClassSerializerInterceptor)
@Controller("answer-sheet")
export class AnswerSheetController {
  constructor(private readonly answerSheetService: AnswerSheetService) {}

  /** basic CRUD endpoints */
  @Post()
  @Roles(UserRole.CANDIDATE)
  create(
    @Req() req: PassportRequest,
    @Query("examId") examId: number
  ): Promise<AnswerSheet> {
    return this.answerSheetService.create(req.user!, examId);
  }

  @Get()
  @Roles(UserRole.ADMIN)
  findAll(
    @Query("key") key: string,
    @Query("value") value: unknown,
    @Query("relations") relations: string,
    @Query("map") map: boolean
  ): Promise<AnswerSheet[]> {
    return this.answerSheetService.findAll(
      key,
      value,
      relations ? relations.split(",") : undefined,
      map
    );
  }

  @UseInterceptors(ExpirationFlagInterceptor)
  @Get("findOne")
  @Roles(UserRole.CANDIDATE)
  findOne(
    @Req() req: PassportRequest,
    @Query("key") key: string,
    @Query("value") value: unknown,
    @Query("relations") relations: string,
    @Query("map") map: boolean
  ): Promise<AnswerSheet> {
    return this.answerSheetService.findOne(
      req.user!.id,
      key,
      value,
      relations ? relations.split(",") : undefined,
      map
    );
  }

  /** custom endpoints */
  @UseInterceptors(ExpirationFlagInterceptor)
  @Get("start")
  @Roles(UserRole.CANDIDATE)
  start(
    @Req() req: PassportRequest,
    @Query("id") id: number
  ): Promise<AnswerSheet> {
    return this.answerSheetService.start(req.user!.id, id);
  }

  @Patch("submit")
  @Roles(UserRole.CANDIDATE)
  submit(
    @Req() req: PassportRequest,
    @Query("id") id: number
  ): Promise<AnswerSheet> {
    return this.answerSheetService.submit(req.user!.id, id);
  }

  @Get("fetchOwnAnswerSheets")
  @Roles(UserRole.CANDIDATE)
  fetchOwnAnswerSheets(
    @Req() req: PassportRequest,
    @Query("relations") relations: string,
    @Query("map") map: boolean
  ): Promise<AnswerSheet[]> {
    return this.answerSheetService.fetchOwnAnswerSheets(
      req.user!.id,
      relations ? relations.split(",") : undefined,
      map
    );
  }

  @UseInterceptors(ExpirationFlagInterceptor)
  @Get("fetchSections")
  fetchSections(
    @Req() req: PassportRequest,
    @Query("id") id: number
  ): Promise<AnswerSheet> {
    return this.answerSheetService.fetchSections(req.user!.id, id);
  }

  @Get("submitAndGetEval")
  submitAndGetEval(
    @Req() req: PassportRequest,
    @Query("id") id: number
  ): Promise<AnswerSheet> {
    return this.answerSheetService.submitAndGetEval(req.user!.id, id);
  }
}
