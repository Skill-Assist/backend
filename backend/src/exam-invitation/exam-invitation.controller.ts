/** nestjs */
import {
  Get,
  Req,
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

/** helpers */
import { ExpirationFlagInterceptor } from "./interceptors/expiration-flag.interceptor";
import { PassportRequest } from "../auth/auth.controller";
////////////////////////////////////////////////////////////////////////////////

@ApiTags("examInvitation")
@UseInterceptors(ClassSerializerInterceptor, ExpirationFlagInterceptor)
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

  @Get("resendInvitation")
  async resendInvitation(
    @Req() req: PassportRequest,
    @Query("id") id: number
  ): Promise<ExamInvitation> {
    return this.examInvitationService.resendInvitation(id, req.user!.id);
  }
}
