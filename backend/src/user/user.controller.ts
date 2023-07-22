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

/** entities */
import { User, UserRole } from "./entities/user.entity";

/** dtos */
import { UpdateUserDto } from "./dto/update-user.dto";

/** decorators */
import { Roles } from "../auth/decorators/roles.decorator";

/** utils */
import { PassportRequest } from "../utils/api-types.utils";
////////////////////////////////////////////////////////////////////////////////

@ApiTags("user")
@UseInterceptors(ClassSerializerInterceptor)
@Controller("user")
export class UserController {
  constructor(private readonly userService: UserService) {}
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
