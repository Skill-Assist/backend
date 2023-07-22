import {
  Min,
  Max,
  Length,
  IsEnum,
  IsNumber,
  IsString,
  IsObject,
  IsBoolean,
  IsOptional,
} from "class-validator";
import { GradingRubric } from "../../utils/api-types.utils";
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
  @IsString({ each: true })
  @Length(2, 25, {
    each: true,
    message: "Tags must be between 2 and 25 characters long.",
  })
  tags?: string[];

  @IsOptional()
  @IsBoolean()
  isShareable?: boolean;
}
