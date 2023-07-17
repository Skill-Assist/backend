/** nestjs */
import { PassportStrategy } from "@nestjs/passport";
import { Injectable, UnauthorizedException } from "@nestjs/common";

/** providers */
import { AuthService } from "./auth.service";

/** external dependencies */
import { Strategy } from "passport-local";

/** entities & dtos */
import { User } from "../user/entities/user.entity";
////////////////////////////////////////////////////////////////////////////////

/**
 * LocalStrategy
 * @see https://docs.nestjs.com/recipes/passport#implementing-passport-local
 */

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly authService: AuthService) {
    super({ usernameField: "email" });
  }

  async validate(email: string, pass: string): Promise<User> {
    const user = await this.authService.validateUser(email, pass);

    if (!user)
      throw new UnauthorizedException(
        "Invalid credentials. Provided email or password is incorrect."
      );
    return user;
  }
}
