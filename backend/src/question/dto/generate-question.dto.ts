import { Length, IsEnum, IsString } from "class-validator";
//////////////////////////////////////////////////////////////////////////////////////

export class GenerateQuestionDto {
  @IsEnum(["text", "multiple-choice", "programming", "challenge"], {
    message:
      "Type must be either text, multiple-choice, programming or challenge.",
  })
  type: string;

  @IsString()
  @Length(20, 1000, {
    message: "Prompt must be between 20 and 1000 characters long.",
  })
  prompt: string;
}
