import { IsString, IsOptional, IsNumber } from "class-validator";
//////////////////////////////////////////////////////////////////////////////////////

export class UpdateAnswerDto {
  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsString()
  keyboard?: string;

  @IsOptional()
  @IsString()
  mouse?: string;

  @IsOptional()
  @IsNumber()
  aiScore?: number;

  @IsOptional()
  @IsString()
  aiFeedback?: string;

  @IsOptional()
  @IsNumber()
  revisedScore?: number;

  @IsOptional()
  @IsString()
  revisedFeedback?: string;
}
