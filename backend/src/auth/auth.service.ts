/** nestjs */
import { JwtService } from "@nestjs/jwt";
import { Injectable } from "@nestjs/common";

/** providers */
import { UserService } from "../user/user.service";

/** entities */
import { User, decryptPassword } from "../user/entities/user.entity";
////////////////////////////////////////////////////////////////////////////////

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly userService: UserService
  ) {}

  async validateUser(email: string, pass: string): Promise<User | null> {
    const user = await (<Promise<User>>(
      this.userService.findOne("email", email)
    ));

    if (!user) return null;

    return (await decryptPassword(pass, user?.password)) ? user : null;
  }

  async login(user: User) {
    return {
      access_token: this.jwtService.sign({ email: user.email, sub: user.id }),
      userRole: user.roles,
    };
  }
}
