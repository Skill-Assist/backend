/** nestjs */
import {
  Get,
  Req,
  Body,
  Patch,
  Query,
  Controller,
  UploadedFile,
  UseInterceptors,
  ClassSerializerInterceptor,
  UnprocessableEntityException,
  UnauthorizedException,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";

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

@UseInterceptors(ClassSerializerInterceptor)
@Controller("user")
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get("profile")
  profile(@Req() req: PassportRequest): Promise<User> {
    return this.userService.profile(req.user!.id);
  }

  @Patch("updateProfile")
  @UseInterceptors(FileInterceptor("file"))
  updateProfile(
    @Req() req: PassportRequest,
    @Body() updateUserDto?: UpdateUserDto,
    @UploadedFile() file?: Express.Multer.File
  ): Promise<User | null> {
    if (!updateUserDto && !file)
      throw new UnauthorizedException("No data provided");

    if (
      file &&
      (!file.mimetype.startsWith("image") || file.size > 10 * 1024 * 1024)
    )
      throw new UnprocessableEntityException(
        "File must be an image and less than 10MB"
      );

    return this.userService.updateProfile(req.user!.id, updateUserDto, file);
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
