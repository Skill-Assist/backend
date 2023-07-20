import { IsString, IsOptional } from "class-validator";
//////////////////////////////////////////////////////////////////////////////////////

export class SubmitAnswersDto {
  @IsOptional()
  @IsString()
  content: string;

  @IsOptional()
  @IsString()
  keyboard: string;

  @IsOptional()
  @IsString()
  mouse: string;
}
