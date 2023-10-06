import { Length, IsNumber, IsString, IsBoolean, IsIn } from "class-validator";
//////////////////////////////////////////////////////////////////////////////////////

export class CreateExamDto {
  @IsString()
  @Length(1, 50)
  jobTitle: string;

  @IsIn(["Estágio", "Trainee", "Júnior", "Pleno", "Sênior", "Outro"])
  jobLevel: string;

  @IsString()
  @Length(1, 400)
  description: string;

  @IsNumber()
  durationInHours: number;

  @IsNumber()
  submissionInHours: number;

  @IsBoolean()
  showScore: boolean;

  @IsBoolean()
  isPublic: boolean;
}
