import {
  Min,
  Max,
  Length,
  IsNumber,
  Validate,
  IsString,
  IsBoolean,
  IsOptional,
} from "class-validator";
import { isValid } from "date-fns";
//////////////////////////////////////////////////////////////////////////////////////

export class CreateSectionDto {
  @IsString({
    message: "Name must be a string.",
  })
  @Length(3, 15, {
    message: "Name must be between 3 and 15 characters long.",
  })
  name: string;

  @IsString({
    message: "Description must be a string.",
  })
  @Length(15, 100, {
    message: "Description must be between 15 and 100 characters long.",
  })
  description: string;

  @IsNumber()
  @Min(0)
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
