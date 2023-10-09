import {
  Min,
  Max,
  MaxLength,
  IsNumber,
  Validate,
  IsString,
  IsBoolean,
  IsOptional,
} from "class-validator";
import { isValid } from "date-fns";
//////////////////////////////////////////////////////////////////////////////////////

export class CreateSectionDto {
  @IsString()
  @MaxLength(100)
  name: string;

  @IsString()
  @MaxLength(500)
  description: string;

  @IsNumber()
  @Min(0.01)
  @Max(1)
  weight: number;

  @IsOptional()
  @Validate((value: Date) => isValid(value))
  startDate?: Date;

  @IsOptional()
  @Max(24 * 30)
  @IsNumber()
  durationInHours?: number;

  @IsOptional()
  @IsBoolean()
  isShuffleQuestions?: boolean;

  @IsOptional()
  @IsBoolean()
  hasProctoring?: boolean;
}
