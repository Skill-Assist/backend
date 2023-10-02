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
    message: "Name must be a string",
  })
  @Length(1, 100, {
    message: "Name cannot be longer than 100 characters",
  })
  name: string;

  @IsString({
    message: "Description must be a string",
  })
  @Length(15, 500, {
    message: "Description cannot be longer than 500 characters",
  })
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
