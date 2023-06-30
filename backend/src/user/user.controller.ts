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
import { UserService } from "./user.service";

/** entities & dtos */
import { User } from "./entities/user.entity";

/** utils */
import { PassportRequest } from "../auth/auth.controller";
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

  @Get("acceptInvitation")
  acceptInvitation(
    @Req() req: PassportRequest,
    @Query("invitationId") token: number
  ): Promise<User> {
    return this.userService.acceptInvitation(token, req.user!);
  }
}
