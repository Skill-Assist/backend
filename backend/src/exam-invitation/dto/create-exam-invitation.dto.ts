import { IsEmail, Min, Max, IsOptional, IsNumber } from "class-validator";
//////////////////////////////////////////////////////////////////////////////////////

export class CreateExamInvitationDto {
  @IsEmail()
  email: string;

  @IsOptional()
  @Min(1)
  @Max(24 * 7)
  @IsNumber()
  expirationInHours: number;
}
