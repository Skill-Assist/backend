import { Length, IsString, IsIn } from "class-validator";
//////////////////////////////////////////////////////////////////////////////////////

export class SuggestDescriptionDto {
  @IsString()
  @Length(1, 50)
  jobTitle: string;

  @IsIn(["estágio", "trainee", "júnior", "pleno", "sênior", "outro"])
  jobLevel: string;
}
