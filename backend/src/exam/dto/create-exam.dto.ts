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
    message: "Title must be a string",
  })
  @Length(1, 50, {
    message: "Title cannot be longer than 50 characters",
  })
  title: string;

  @IsOptional()
  @IsString({
    message: "Subtitle must be a string",
  })
  @Length(1, 50, {
    message: "Subtitle cannot be longer than 50 characters",
  })
  subtitle?: string;

  @IsOptional()
  @IsString({
    message: "Level must be a string",
  })
  @Length(1, 50, {
    message: "Level cannot be longer than 50 characters",
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
