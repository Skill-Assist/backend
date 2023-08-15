import { IsString, IsOptional } from "class-validator";
//////////////////////////////////////////////////////////////////////////////////////

export class SubmitAnswersDto {
  @IsString()
  content: string;

  @IsOptional()
  @IsString()
  keyboard: any;

  @IsOptional()
  @IsString()
  mouse: any;
}
