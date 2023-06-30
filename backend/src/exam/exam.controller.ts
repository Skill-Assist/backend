/** nestjs */
import {
  Get,
  Req,
  Post,
  Body,
  Query,
  Patch,
  Param,
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
  findAll(
    @Query("key") key: string,
    @Query("value") value: unknown,
    @Query("relations") relations: string
  ): Promise<Exam[]> {
    return this.examService.findAll(
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
  ): Promise<Exam | null> {
    return this.examService.findOne(
      key,
      value,
      relations ? relations.split(",") : undefined,
      map
    );
  }

  @Patch(":id")
  @Roles(UserRole.RECRUITER)
  update(
    @Param("id") id: number,
    @Body() updateExamDto: UpdateExamDto
  ): Promise<Exam> {
    return this.examService.update(id, updateExamDto);
  }

  /** custom endpoints */
  @Get(":id/switchStatus")
  @Roles(UserRole.RECRUITER)
  switchStatus(
    @Param("id") id: number,
    @Query("status") status: string
  ): Promise<Exam> {
    return this.examService.switchStatus(id, status);
  }

  @Post(":id/invite")
  @Roles(UserRole.RECRUITER)
  invite(
    @Param("id") id: number,
    @Body() inviteDto: InviteDto
  ): Promise<string> {
    return this.examService.invite(id, inviteDto);
  }
}
