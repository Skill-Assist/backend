import {
  IsIn,
  IsNumber,
  IsString,
  IsBoolean,
  MaxLength,
} from "class-validator";
//////////////////////////////////////////////////////////////////////////////////////

export class CreateExamDto {
  @IsString()
  @MaxLength(50)
  jobTitle: string;

  @IsIn(["estágio", "trainee", "júnior", "pleno", "sênior"])
  jobLevel: string;

  @IsString()
  @MaxLength(400)
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
