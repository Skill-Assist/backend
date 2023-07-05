import { IsArray, IsEmail, IsNumber, Min, Max } from "class-validator";
//////////////////////////////////////////////////////////////////////////////////////

export class InviteDto {
  @IsArray()
  @IsEmail({}, { each: true })
  email: string[];

  @Min(1)
  @Max(24 * 7)
  @IsNumber()
  expirationInHours: number;
}
