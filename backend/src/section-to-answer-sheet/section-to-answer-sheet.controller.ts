/** nestjs */
import {
  Req,
  Get,
  Post,
  Query,
  Controller,
  UseInterceptors,
  ClassSerializerInterceptor,
} from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";

/** providers */
import { SectionToAnswerSheetService } from "./section-to-answer-sheet.service";

/** entities */
import { SectionToAnswerSheet } from "./entities/section-to-answer-sheet.entity";

/** utils */
import { UserRole } from "../user/entities/user.entity";
import { PassportRequest } from "../utils/types.utils";
import { Roles } from "../auth/decorators/roles.decorator";
import { ExpirationFlagInterceptor } from "./interceptors/expiration-flag.interceptor";
////////////////////////////////////////////////////////////////////////////////

@ApiTags("section-to-answer-sheet")
@UseInterceptors(ClassSerializerInterceptor)
@Controller("section-to-answer-sheet")
export class SectionToAnswerSheetController {
  constructor(
    private readonly sectionToAnswerSheetService: SectionToAnswerSheetService
  ) {}

  /** basic CRUD endpoints */
  @UseInterceptors(ExpirationFlagInterceptor)
  @Post()
  @Roles(UserRole.CANDIDATE)
  create(
    @Req() req: PassportRequest,
    @Query("sectionId") sectionId: number,
    @Query("answerSheetId") answerSheetId: number
  ): Promise<SectionToAnswerSheet> {
    return this.sectionToAnswerSheetService.create(
      req.user!.id,
      sectionId,
      answerSheetId
    );
  }

  @Get()
  // @Roles(UserRole.ADMIN)
  findAll(
    @Query("key") key: string,
    @Query("value") value: unknown,
    @Query("relations") relations: string,
    @Query("map") map: boolean
  ): Promise<SectionToAnswerSheet[]> {
    return this.sectionToAnswerSheetService.findAll(
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
  ): Promise<SectionToAnswerSheet> {
    return this.sectionToAnswerSheetService.findOne(
      req.user!.id,
      key,
      value,
      relations ? relations.split(",") : undefined,
      map
    );
  }

  /** custom endpoints */
  @UseInterceptors(ExpirationFlagInterceptor)
  @Post("batch-answer")
  @Roles(UserRole.CANDIDATE)
  createBatchAnswer(
    @Req() req: PassportRequest,
    @Query("sectionId") sectionId: number,
    @Query("answerSheetId") answerSheetId: number
  ): Promise<SectionToAnswerSheet> {
    return this.sectionToAnswerSheetService.createBatchAnswer(
      req.user!.id,
      sectionId,
      answerSheetId
    );
  }
}
