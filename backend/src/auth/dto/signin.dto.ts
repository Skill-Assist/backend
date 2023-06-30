import { OmitType } from "@nestjs/swagger";
import { CreateUserDto } from "../../user/dto/create-user.dto";
//////////////////////////////////////////////////////////////////////////////////////

export class SigninDto extends OmitType(CreateUserDto, [
  "email",
  "password",
] as const) {}
