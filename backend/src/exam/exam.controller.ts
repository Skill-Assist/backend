/** nestjs */
import {
  Get,
  Req,
  Post,
  Body,
  Query,
  Patch,
  Controller,
  UseInterceptors,
  ClassSerializerInterceptor,
} from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";

/** providers */
import { ExamService } from "./exam.service";

/** entities */
import { Exam } from "./entities/exam.entity";
import { UserRole } from "../user/entities/user.entity";

/** dtos */
import { InviteDto } from "./dto/invite.dto";
import { CreateExamDto } from "./dto/create-exam.dto";
import { UpdateExamDto } from "./dto/update-exam.dto";

/** decorators */
import { Roles } from "../auth/decorators/roles.decorator";

/** utils */
import { PassportRequest } from "../utils/api-types.utils";
////////////////////////////////////////////////////////////////////////////////

@ApiTags("exam")
@UseInterceptors(ClassSerializerInterceptor)
@Controller("exam")
export class ExamController {
  constructor(private readonly examService: ExamService) {}

  /** basic CRUD endpoints */
  @Post()
  @Roles(UserRole.RECRUITER)
  create(
    @Req() req: PassportRequest,
    @Body() createExamDto: CreateExamDto
  ): Promise<Exam> {
    return this.examService.create(req.user!.id, createExamDto);
  }

  @Get("findOne")
  findOne(
    @Req() req: PassportRequest,
    @Query("key") key: string,
    @Query("value") value: unknown,
    @Query("relations") relations: string,
    @Query("map") map: boolean
  ): Promise<Exam> {
    return this.examService.findOne(
      req.user!.id,
      key,
      value,
      relations ? relations.split(",") : undefined,
      map
    );
  }

  @Patch()
  @Roles(UserRole.RECRUITER)
  update(
    @Req() req: PassportRequest,
    @Query("id") id: number,
    @Body() updateExamDto: UpdateExamDto
  ): Promise<Exam> {
    return this.examService.update(req.user!.id, id, updateExamDto);
  }

  /** custom endpoints */
  @Get("fetchOwn")
  fetchOwn(
    @Req() req: PassportRequest,
    @Query("relations") relations: string,
    @Query("map") map: boolean
  ): Promise<Exam[]> {
    return this.examService.fetchOwn(
      req.user!.id,
      relations ? relations.split(",") : undefined,
      map
    );
  }

  @Get("switchStatus")
  @Roles(UserRole.RECRUITER)
  switchStatus(
    @Req() req: PassportRequest,
    @Query("id") id: number,
    @Query("status") status: string
  ): Promise<Exam> {
    return this.examService.switchStatus(req.user!.id, id, status);
  }

  @Post("sendInvitations")
  @Roles(UserRole.RECRUITER)
  sendInvitations(
    @Req() req: PassportRequest,
    @Query("id") id: number,
    @Body() inviteDto: InviteDto
  ): Promise<string> {
    return this.examService.sendInvitations(req.user!.id, id, inviteDto);
  }

  @Get("fetchCandidates")
  @Roles(UserRole.RECRUITER)
  fetchCandidates(
    @Req() req: PassportRequest,
    @Query("id") id: number
  ): Promise<any> {
    return this.examService.fetchCandidates(req.user!.id, id);
  }
}
