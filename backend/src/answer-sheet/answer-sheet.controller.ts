/** nestjs */
import {
  Get,
  Req,
  Post,
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
import { UserRole } from "../user/entities/user.entity";

/** decorators */
import { Roles } from "../auth/decorators/roles.decorator";

/** interceptors */
import { AutocloseInterceptor } from "./interceptors/autoclose.interceptor";
import { ExpirationFlagInterceptor } from "./interceptors/expiration-flag.interceptor";

/** utils */
import { PassportRequest } from "../utils/types.utils";
////////////////////////////////////////////////////////////////////////////////

ApiTags("answer-sheet");
@UseInterceptors(ClassSerializerInterceptor)
@Controller("answer-sheet")
export class AnswerSheetController {
  constructor(private readonly answerSheetService: AnswerSheetService) {}

  /** basic CRUD endpoints */
  @Post()
  @Roles(UserRole.ADMIN)
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

  @UseInterceptors(AutocloseInterceptor, ExpirationFlagInterceptor)
  @Get("findOne")
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
  @Get("start")
  @Roles(UserRole.CANDIDATE)
  start(
    @Req() req: PassportRequest,
    @Query("id") id: number
  ): Promise<AnswerSheet> {
    return this.answerSheetService.start(req.user!.id, id);
  }

  @Get("submit")
  @Roles(UserRole.CANDIDATE)
  submit(
    @Req() req: PassportRequest,
    @Query("id") id: number
  ): Promise<AnswerSheet> {
    return this.answerSheetService.submit(req.user!.id, id);
  }

  @UseInterceptors(AutocloseInterceptor, ExpirationFlagInterceptor)
  @Get("fetchOwn")
  fetchOwn(
    @Req() req: PassportRequest,
    @Query("relations") relations: string,
    @Query("map") map: boolean
  ): Promise<AnswerSheet[]> {
    return this.answerSheetService.fetchOwn(
      req.user!.id,
      relations ? relations.split(",") : undefined,
      map
    );
  }

  @UseInterceptors(AutocloseInterceptor, ExpirationFlagInterceptor)
  @Get("fetchSections")
  fetchSections(
    @Req() req: PassportRequest,
    @Query("id") id: number
  ): Promise<AnswerSheet> {
    return this.answerSheetService.fetchSections(req.user!.id, id);
  }

  @Get("generateEval")
  @Roles(UserRole.RECRUITER)
  generateEval(
    @Req() req: PassportRequest,
    @Query("id") id: number
  ): Promise<AnswerSheet> {
    return this.answerSheetService.generateEval(req.user!.id, id);
  }
}
