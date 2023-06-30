import { IsArray, IsNumber, Max, Min } from "class-validator";
//////////////////////////////////////////////////////////////////////////////////////

export class InviteDto {
  @IsArray()
  email: string[];

  @Min(1)
  @Max(24 * 7)
  @IsNumber()
  expirationInHours: number;
}
