import { IsString } from "class-validator";
//////////////////////////////////////////////////////////////////////////////////////

export class CreateAnswerDto {
  @IsString()
  questionRef: string;
}
