import { Length, IsString, IsIn } from "class-validator";
//////////////////////////////////////////////////////////////////////////////////////

export class SuggestDescriptionDto {
  @IsString()
  @Length(1, 50)
  jobTitle: string;

  @IsIn(["Estágio", "Trainee", "Júnior", "Pleno", "Sênior", "Outro"])
  jobLevel: string;
}
