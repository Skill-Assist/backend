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
import { PassportRequest } from "../utils/types.utils";
import { ExpirationFlagInterceptor } from "./interceptors/expiration-flag.interceptor";
import { Roles } from "../auth/decorators/roles.decorator";
import { UserRole } from "../user/entities/user.entity";
////////////////////////////////////////////////////////////////////////////////

@ApiTags("examInvitation")
@UseInterceptors(ClassSerializerInterceptor, ExpirationFlagInterceptor)
@Controller("examInvitation")
export class ExamInvitationController {
  constructor(private readonly examInvitationService: ExamInvitationService) {}

  /** basic CRUD endpoints */
  @Get()
  @Roles(UserRole.ADMIN)
  findAll(
    @Query("key") key: string,
    @Query("value") value: unknown,
    @Query("relations") relations: string
  ): Promise<ExamInvitation[]> {
    return this.examInvitationService.findAll(
      key,
      value,
      relations ? relations.split(",") : undefined
    );
  }

  /** custom endpoints */
  @Get("resendInvitation")
  @Roles(UserRole.RECRUITER)
  async resendInvitation(
    @Req() req: PassportRequest,
    @Query("id") id: number
  ): Promise<ExamInvitation[]> {
    return this.examInvitationService.resendInvitation(id, req.user!.id);
  }

  @Get("fetchOwnInvitations")
  async fetchOwnInvitations(
    @Req() req: PassportRequest
  ): Promise<ExamInvitation[]> {
    return this.examInvitationService.fetchOwnInvitations(req.user!.id);
  }
}
