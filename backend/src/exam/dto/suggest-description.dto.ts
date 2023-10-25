import { Transform } from "class-transformer";
import { Length, IsString, IsIn } from "class-validator";
//////////////////////////////////////////////////////////////////////////////////////

export class SuggestDescriptionDto {
  @IsString()
  @Transform(({ value }) => value.trim())
  @Length(1, 50, {
    message: "Job title must be between 1 and 50 characters long",
  })
  jobTitle: string;

  @IsIn(["estágio", "trainee", "júnior", "pleno", "sênior", "outro"])
  jobLevel: string;
}
