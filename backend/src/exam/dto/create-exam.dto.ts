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

export class CreateExamDto {
  @IsString({
    message: "Title must be a string.",
  })
  @Length(3, 50, {
    message: "Title must be between 3 and 50 characters long.",
  })
  title: string;

  @IsOptional()
  @IsString({
    message: "Title must be a string.",
  })
  @Length(3, 20, {
    message: "Title must be between 3 and 20 characters long.",
  })
  subtitle?: string;

  @IsOptional()
  @IsString({
    message: "Title must be a string.",
  })
  @Length(3, 20, {
    message: "Title must be between 3 and 20 characters long.",
  })
  level?: string;

  @Min(1)
  @Max(24 * 30)
  @IsNumber()
  durationInHours: number;

  @Min(24)
  @Max(24 * 60)
  @IsNumber()
  submissionInHours: number;

  @IsOptional()
  @Validate((value: Date) => isValid(value))
  dateToArchive?: Date;

  @IsOptional()
  @IsBoolean()
  showScore?: boolean;

  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;
}
