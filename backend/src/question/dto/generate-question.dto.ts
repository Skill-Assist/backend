import { Length, IsEnum, IsString } from "class-validator";
//////////////////////////////////////////////////////////////////////////////////////

export class GenerateQuestionDto {
  @IsEnum(["text", "multiple-choice", "programming", "challenge"], {
    message:
      "Type must be either text, multiple-choice, programming or challenge.",
  })
  type: string;

  @IsString()
  @Length(1, 5000, {
    message: "Prompt cannot be longer than 5000 characters",
  })
  prompt: string;
}
