import { IsArray, IsEmail, IsNumber } from "class-validator";
//////////////////////////////////////////////////////////////////////////////////////

export class InviteDto {
  @IsArray()
  @IsEmail({}, { each: true })
  email: string[];

  @IsNumber()
  expirationInHours: number;
}
