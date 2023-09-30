/** nestjs */
import {
  Get,
  Req,
  Post,
  Body,
  HttpCode,
  UseGuards,
  Controller,
  HttpStatus,
  UnauthorizedException,
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";

/** providers */
import { AuthService } from "./auth.service";
import { UserService } from "../user/user.service";

/** entities & dtos */
import { CreateUserDto } from "../user/dto/create-user.dto";

/** guards */
import { AllowAnon } from "./guards/allow-anon.guard";

/** utils */
import {
  PassportJwt,
  SessionRequest,
  PassportRequest,
} from "../utils/api-types.utils";
////////////////////////////////////////////////////////////////////////////////

@Controller("auth")
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly userService: UserService
  ) {}

  @AllowAnon()
  @Post("signup")
  async signup(@Body() createUserDto: CreateUserDto): Promise<PassportJwt> {
    return this.authService.login(await this.userService.create(createUserDto));
  }

  @AllowAnon()
  @UseGuards(AuthGuard("local"))
  @HttpCode(HttpStatus.OK)
  @Post("signin")
  async signin(@Req() req: SessionRequest): Promise<PassportJwt> {
    if (!req.user)
      throw new UnauthorizedException("User not found. Please try again.");

    return await this.authService.login(req.user);

    // if (!req.session.user) {
    //   req.session.user = {
    //     [req.user.id]: {
    //       visits: 1,
    //     },
    //   };
    // } else if (!req.session.user[req.user.id]) {
    //   req.session.user[req.user.id] = {
    //     visits: 1,
    //   };
    // } else {
    //   req.session.user[req.user.id].visits++;
    // }

    // console.log("req.session: ", req.session);
  }

  @Get("signout")
  signout(@Req() req: PassportRequest): string {
    return "TODO : add jwt to blacklist";
  }
}
