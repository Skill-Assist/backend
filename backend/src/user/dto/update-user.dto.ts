import { CreateUserDto } from "./create-user.dto";
import { PartialType } from "@nestjs/mapped-types";
import { IsUrl, IsOptional } from "class-validator";
//////////////////////////////////////////////////////////////////////////////////////

export class UpdateUserDto extends PartialType(CreateUserDto) {
  @IsOptional()
  @IsUrl()
  logo?: string;
}
