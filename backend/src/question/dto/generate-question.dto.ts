import {
  Min,
  Max,
  Length,
  IsEnum,
  IsNumber,
  IsString,
  IsOptional,
} from "class-validator";
//////////////////////////////////////////////////////////////////////////////////////

export class GenerateQuestionDto {
  @IsEnum(["text", "multiple-choice", "programming", "challenge"], {
    message:
      "Type must be either text, multiple-choice, programming or challenge.",
  })
  type: string;

  @IsString()
  @Length(10, 500, {
    message: "Statement must be between 10 and 500 characters long.",
  })
  statement: string;

  @IsOptional()
  @Min(10)
  @Max(100)
  @IsNumber()
  value?: number;

  @IsOptional()
  @Min(1)
  @Max(5)
  @IsNumber()
  difficulty?: number;

  @IsOptional()
  @IsString({ each: true })
  @Length(2, 25, {
    each: true,
    message: "Tags must be between 2 and 25 characters long.",
  })
  tags?: string[];
}
