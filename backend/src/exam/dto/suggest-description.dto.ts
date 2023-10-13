import { MaxLength, IsString, IsIn } from "class-validator";
//////////////////////////////////////////////////////////////////////////////////////

export class SuggestDescriptionDto {
  @IsString()
  @MaxLength(50)
  jobTitle: string;

  @IsIn(["estágio", "trainee", "júnior", "pleno", "sênior", "outro"])
  jobLevel: string;
}
