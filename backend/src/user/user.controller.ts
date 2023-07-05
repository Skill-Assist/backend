/** nestjs */
import {
  Get,
  Req,
  Body,
  Patch,
  Query,
  Controller,
  UseInterceptors,
  ClassSerializerInterceptor,
} from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";

/** providers */
import { UserService } from "./user.service";

/** entities & dtos */
import { User, UserRole } from "./entities/user.entity";
import { UpdateUserDto } from "./dto/update-user.dto";

/** utils */
import { Roles } from "./decorators/roles.decorator";
import { PassportRequest } from "../auth/auth.controller";
////////////////////////////////////////////////////////////////////////////////

@ApiTags("user")
@UseInterceptors(ClassSerializerInterceptor)
@Controller("user")
export class UserController {
  constructor(private readonly userService: UserService) {}

  /** basic CRUD endpoints */
  @Get()
  @Roles(UserRole.ADMIN)
  findAll(
    @Query("key") key?: string,
    @Query("value") value?: unknown,
    @Query("relations") relations?: string,
    @Query("map") map?: boolean
  ): Promise<User[]> {
    return this.userService.findAll(
      key,
      value,
      relations ? relations.split(",") : undefined,
      map
    );
  }

  @Get("findOne")
  @Roles(UserRole.ADMIN)
  findOne(
    @Query("key") key: string,
    @Query("value") value: unknown,
    @Query("relations") relations?: string,
    @Query("map") map?: boolean
  ): Promise<User | null> {
    return this.userService.findOne(
      key,
      value,
      relations ? relations.split(",") : undefined,
      map
    );
  }

  /** custom endpoints */
  @Get("profile")
  profile(@Req() req: PassportRequest): Promise<User> {
    return this.userService.profile(req.user!.id);
  }

  @Patch("updateProfile")
  updateProfile(
    @Req() req: PassportRequest,
    @Body() updateUserDto: UpdateUserDto
  ): Promise<User> {
    return this.userService.updateProfile(req.user!.id, updateUserDto);
  }

  @Get("acceptInvitation")
  @Roles(UserRole.CANDIDATE)
  acceptInvitation(
    @Req() req: PassportRequest,
    @Query("invitationId") token: number
  ): Promise<User> {
    return this.userService.acceptInvitation(token, req.user!);
  }

  @Get("rejectInvitation")
  @Roles(UserRole.CANDIDATE)
  rejectInvitation(
    @Req() req: PassportRequest,
    @Query("invitationId") token: number
  ): Promise<User> {
    return this.userService.rejectInvitation(token, req.user!);
  }
}
