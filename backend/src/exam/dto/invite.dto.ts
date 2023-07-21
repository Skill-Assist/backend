import { Transform } from "class-transformer";
import { IsArray, IsEmail, IsNumber, Min, Max } from "class-validator";
//////////////////////////////////////////////////////////////////////////////////////

export class InviteDto {
  @Transform((email) => email.value.map((e: string) => e.toLowerCase()))
  @IsArray()
  @IsEmail({}, { each: true })
  email: string[];

  @Min(1)
  @Max(24 * 7)
  @IsNumber()
  expirationInHours: number;
}
