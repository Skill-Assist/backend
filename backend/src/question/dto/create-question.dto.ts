import {
  Min,
  Max,
  IsEnum,
  Matches,
  IsNumber,
  IsObject,
  IsBoolean,
  IsOptional,
} from "class-validator";
//////////////////////////////////////////////////////////////////////////////////////

export class CreateQuestionDto {
  @IsEnum(["text", "multipleChoice", "programming", "challenge"], {
    message:
      "Type must be either text, multipleChoice, programming or challenge",
  })
  type: string;

  @Matches(/^[\da-zA-Z\s]{10,500}$/, {
    message: "Question statement must be between 10 and 500 characters long.",
  })
  statement: string;

  @IsOptional()
  @IsObject()
  options?: object;

  @IsObject()
  gradingRubric: object;

  @IsOptional()
  @Min(1)
  @Max(5)
  @IsNumber()
  difficulty?: number = 2.5;

  @IsOptional()
  @Matches(/^[a-zA-Z\s]{3,10}$/, {
    each: true,
    message:
      "Tags must be between 3 and 10 characters long and contain only letters",
  })
  tags?: string[] = [];

  @IsOptional()
  @IsBoolean()
  isShareable?: boolean = true;
}
