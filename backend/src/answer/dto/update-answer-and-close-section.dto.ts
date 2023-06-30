import { Type } from "class-transformer";
import { IsArray, IsString, IsNumber, ValidateNested } from "class-validator";
//////////////////////////////////////////////////////////////////////////////////////

export class KeyboardDto {
  @IsNumber()
  altAmount: number;

  @IsNumber()
  ctrlCAmount: number;

  @IsNumber()
  ctrlVAmount: number;

  @IsArray()
  keysProctoring: string[];
}

export class MouseDto {
  @IsString()
  mouseLeave: string;

  @IsString()
  mouseEnter: string;

  @IsString()
  questionId: string;
}

export class UpdateAnswerAndCloseSectionDto {
  @IsString()
  content: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => KeyboardDto)
  keyboard: KeyboardDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MouseDto)
  mouse: MouseDto[];
}
