import {
  Min,
  Max,
  Length,
  IsEnum,
  Matches,
  IsNumber,
  IsString,
  IsObject,
  IsBoolean,
  IsOptional,
} from "class-validator";
import { GradingRubric } from "../schemas/question.schema";
//////////////////////////////////////////////////////////////////////////////////////

export class CreateQuestionDto {
  @IsEnum(["text", "multipleChoice", "programming", "challenge"], {
    message:
      "Type must be either text, multipleChoice, programming or challenge.",
  })
  type: string;

  @IsString()
  @Length(10, 500, {
    message: "Statement must be between 10 and 500 characters long.",
  })
  statement: string;

  @IsOptional()
  @IsObject()
  options?: Record<string, string>;

  @IsObject()
  gradingRubric: GradingRubric;

  @IsOptional()
  @Min(1)
  @Max(5)
  @IsNumber()
  difficulty?: number;

  @IsOptional()
  @Matches(/^[a-zA-ZÀ-ÖØ-öø-ÿ0-9\s]{3,10}$/, {
    each: true,
    message: "Tags must be between 3 and 10 characters long.",
  })
  tags?: string[];

  @IsOptional()
  @IsBoolean()
  isShareable?: boolean;
}
