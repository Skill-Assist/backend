/** nestjs */
import {
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
import { Roles } from "../user/decorators/roles.decorator";
////////////////////////////////////////////////////////////////////////////////

@ApiTags("section-to-answer-sheet")
@UseInterceptors(ClassSerializerInterceptor)
@Controller("section-to-answer-sheet")
export class SectionToAnswerSheetController {
  constructor(
    private readonly sectionToAnswerSheetService: SectionToAnswerSheetService
  ) {}

  /** basic CRUD endpoints */
  @Post()
  @Roles(UserRole.CANDIDATE)
  create(
    @Query("sectionId") sectionId: number,
    @Query("answerSheetId") answerSheetId: number
  ): Promise<SectionToAnswerSheet> {
    return this.sectionToAnswerSheetService.create(sectionId, answerSheetId);
  }

  @Get()
  findAll(
    @Query("key") key: string,
    @Query("value") value: unknown,
    @Query("relations") relations: string,
    @Query("map") map: boolean
  ): Promise<SectionToAnswerSheet[]> {
    return this.sectionToAnswerSheetService.findAll(
      key,
      value,
      relations ? relations.split(",") : undefined
    );
  }

  @Get("findOne")
  findOne(
    @Query("key") key: string,
    @Query("value") value: unknown,
    @Query("relations") relations: string,
    @Query("map") map: boolean
  ): Promise<SectionToAnswerSheet | null> {
    return this.sectionToAnswerSheetService.findOne(
      key,
      value,
      relations ? relations.split(",") : undefined
    );
  }

  /** custom endpoints */
  @Post("batch-answer")
  @Roles(UserRole.CANDIDATE)
  createBatch(
    @Query("sectionId") sectionId: number,
    @Query("answerSheetId") answerSheetId: number
  ): Promise<SectionToAnswerSheet> {
    return this.sectionToAnswerSheetService.createBatchAnswer(
      sectionId,
      answerSheetId
    );
  }
}
