/** nestjs */
import {
  Get,
  Query,
  Controller,
  UseInterceptors,
  ClassSerializerInterceptor,
} from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";

/** providers */
import { ExamInvitationService } from "./exam-invitation.service";

/** entities */
import { ExamInvitation } from "./entities/exam-invitation.entity";
////////////////////////////////////////////////////////////////////////////////

@ApiTags("examInvitation")
@UseInterceptors(ClassSerializerInterceptor)
@Controller("examInvitation")
export class ExamInvitationController {
  constructor(private readonly examInvitationService: ExamInvitationService) {}

  /** basic CRUD endpoints */
  @Get()
  findAll(
    @Query("key") key: string,
    @Query("value") value: unknown,
    @Query("relations") relations: string,
    @Query("map") map: boolean
  ): Promise<ExamInvitation[]> {
    return this.examInvitationService.findAll(
      key,
      value,
      relations ? relations.split(",") : undefined,
      map
    );
  }
}
