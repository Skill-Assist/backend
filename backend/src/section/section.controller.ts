/** nestjs */
import {
  Req,
  Get,
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
import { SectionService } from "./section.service";

/** entites */
import { Section } from "./entities/section.entity";
import { UserRole } from "../user/entities/user.entity";

/** dtos */
import { CreateSectionDto } from "./dto/create-section.dto";
import { UpdateSectionDto } from "./dto/update-section.dto";

/** decorators */
import { Roles } from "../auth/decorators/roles.decorator";

/** utils */
import { PassportRequest } from "../utils/types.utils";
////////////////////////////////////////////////////////////////////////////////

@ApiTags("section")
@UseInterceptors(ClassSerializerInterceptor)
@Controller("section")
export class SectionController {
  constructor(private readonly sectionService: SectionService) {}

  /** basic CRUD endpoints */
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

  @Patch()
  @Roles(UserRole.RECRUITER)
  update(
    @Req() req: PassportRequest,
    @Query("id") id: number,
    @Body() updateSectionDto: UpdateSectionDto
  ): Promise<Section> {
    return this.sectionService.update(req.user!.id, id, updateSectionDto);
  }
}
