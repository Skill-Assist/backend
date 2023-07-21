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
import { UserRole } from "../user/entities/user.entity";
import { ExamInvitation } from "./entities/exam-invitation.entity";

/** decorators */
import { Roles } from "../auth/decorators/roles.decorator";

/** interceptors */
import { ExpirationFlagInterceptor } from "./interceptors/expiration-flag.interceptor";

/** utils */
import { PassportRequest } from "../utils/types.utils";
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

  /** custom endpoints */
  @Get("resend")
  @Roles(UserRole.RECRUITER)
  async resend(
    @Req() req: PassportRequest,
    @Query("id") id: number
  ): Promise<ExamInvitation[]> {
    return this.examInvitationService.resend(id, req.user!.id);
  }

  @Get("fetchOwn")
  async fetchOwn(@Req() req: PassportRequest): Promise<ExamInvitation[]> {
    return this.examInvitationService.fetchOwn(req.user!.id);
  }
}
