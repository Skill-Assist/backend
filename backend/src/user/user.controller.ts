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
// import { InvitationCreatedAtInterceptor } from "./interceptors/invitation-createdAt-interceptor";
////////////////////////////////////////////////////////////////////////////////

@ApiTags("user")
@UseInterceptors(ClassSerializerInterceptor)
@Controller("user")
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get("profile")
  // @UseInterceptors(InvitationCreatedAtInterceptor)
  profile(@Req() req: PassportRequest): Promise<User> {
    return this.userService.profile(req.user!.id);
  }

  @Get("acceptInvitation")
  @Roles(UserRole.CANDIDATE)
  acceptInvitation(
    @Req() req: PassportRequest,
    @Query("invitationId") token: number
  ): Promise<User> {
    return this.userService.acceptInvitation(token, req.user!);
  }

  @Patch("updateProfile")
  updateProfile(
    @Req() req: PassportRequest,
    @Body() updateUserDto: UpdateUserDto
  ): Promise<User> {
    return this.userService.updateProfile(req.user!.id, updateUserDto);
  }
}
