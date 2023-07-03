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
  findAll(
    @Query("key") key: string,
    @Query("value") value: unknown,
    @Query("relations") relations: string,
    @Query("map") map: boolean
  ) {
    return this.answerSheetService.findAll(
      key,
      value,
      relations ? relations.split(",") : undefined,
      map
    );
  }

  @Get("findOne")
  findOne(
    @Query("key") key: string,
    @Query("value") value: unknown,
    @Query("relations") relations: string,
    @Query("map") map: boolean
  ) {
    return this.answerSheetService.findOne(
      key,
      value,
      relations ? relations.split(",") : undefined,
      map
    );
  }

  /** custom endpoints */
  @Patch("submit")
  @Roles(UserRole.CANDIDATE)
  submit(@Query("id") id: number): Promise<string> {
    return this.answerSheetService.submit(id);
  }

  @Get("findOneWithSections")
  getAnswerSheetWithSections(
    @Query("id") id: number
  ): Promise<AnswerSheet | null> {
    return this.answerSheetService.getAnswerSheetWithSections(id);
  }
}
