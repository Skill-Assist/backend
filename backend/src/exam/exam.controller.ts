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

/** entities & dtos */
import { InviteDto } from "./dto/invite.dto";
import { Exam } from "./entities/exam.entity";
import { CreateExamDto } from "./dto/create-exam.dto";
import { UpdateExamDto } from "./dto/update-exam.dto";

/** utils */
import { UserRole } from "../user/entities/user.entity";
import { PassportRequest } from "../auth/auth.controller";
import { Roles } from "../user/decorators/roles.decorator";
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

  @Get()
  @Roles(UserRole.ADMIN)
  findAll(
    @Query("key") key: string,
    @Query("value") value: unknown,
    @Query("relations") relations: string,
    @Query("map") map: boolean
  ): Promise<Exam[]> {
    return this.examService.findAll(
      key,
      value,
      relations ? relations.split(",") : undefined,
      map
    );
  }

  @Get("findOne")
  @Roles(UserRole.RECRUITER)
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
  @Get("fetchOwnedExams")
  @Roles(UserRole.RECRUITER)
  fetchOwnedExams(
    @Req() req: PassportRequest,
    @Query("relations") relations: string,
    @Query("map") map: boolean
  ): Promise<Exam[]> {
    return this.examService.fetchOwnedExams(
      req.user!.id,
      relations ? relations.split(",") : undefined,
      map
    );
  }

  @Get(":id/switchStatus")
  @Roles(UserRole.RECRUITER)
  switchStatus(
    @Req() req: PassportRequest,
    @Query("id") id: number,
    @Query("status") status: string
  ): Promise<Exam> {
    return this.examService.switchStatus(req.user!.id, id, status);
  }

  @Post(":id/invite")
  @Roles(UserRole.RECRUITER)
  sendInvitations(
    @Req() req: PassportRequest,
    @Query("id") id: number,
    @Body() inviteDto: InviteDto
  ): Promise<string> {
    return this.examService.sendInvitations(req.user!.id, id, inviteDto);
  }
}
