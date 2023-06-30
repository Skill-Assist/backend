/** nestjs */
import { Injectable } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";

/** external dependencies */
import { ExtractJwt, Strategy } from "passport-jwt";

/** providers */
import { UserService } from "../user/user.service";

/** entities & dtos */
import { User } from "../user/entities/user.entity";
////////////////////////////////////////////////////////////////////////////////

/**
 * JwtStrategy
 * @see https://docs.nestjs.com/recipes/passport#implementing-passport-jwt
 */

interface Payload {
  sub: string;
  email: string;
  iat: number;
  exp: number;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly userService: UserService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: process.env.JWT_SECRET,
      ignoreExpiration: false,
    });
  }

  async validate(payload: Payload): Promise<User> {
    return await (<Promise<User>>(
      this.userService.findOne("email", payload.email)
    ));
  }
}
