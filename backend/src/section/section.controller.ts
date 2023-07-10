/** nestjs */
import {
  Req,
  Get,
  Post,
  Body,
  Query,
  Controller,
  UseInterceptors,
  ClassSerializerInterceptor,
} from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";

/** providers */
import { SectionService } from "./section.service";

/** entites & dtos */
import { Section } from "./entities/section.entity";
import { CreateSectionDto } from "./dto/create-section.dto";

/** utils */
import { UserRole } from "../user/entities/user.entity";
import { PassportRequest } from "../auth/auth.controller";
import { Roles } from "../user/decorators/roles.decorator";
////////////////////////////////////////////////////////////////////////////////

@ApiTags("section")
@UseInterceptors(ClassSerializerInterceptor)
@Controller("section")
export class SectionController {
  constructor(private readonly sectionService: SectionService) {}

  @Post()
  @Roles(UserRole.RECRUITER)
  create(
    @Req() req: PassportRequest,
    @Body() createSectionDto: CreateSectionDto,
    @Query("examId") examId: number
  ): Promise<Section> {
    return this.sectionService.create(req.user!.id, examId, createSectionDto);
  }

  @Get()
  @Roles(UserRole.ADMIN)
  findAll(
    @Query("key") key?: string,
    @Query("value") value?: unknown,
    @Query("relations") relations?: string,
    @Query("map") map?: boolean
  ): Promise<Section[]> {
    return this.sectionService.findAll(
      key,
      value,
      relations ? relations.split(",") : undefined,
      map
    );
  }

  @Get("findOne")
  findOne(
    @Req() req: PassportRequest,
    @Query("key") key: string,
    @Query("value") value: unknown,
    @Query("relations") relations?: string,
    @Query("map") map?: boolean
  ): Promise<Section> {
    return this.sectionService.findOne(
      req.user!.id,
      key,
      value,
      relations ? relations.split(",") : undefined,
      map
    );
  }
}
