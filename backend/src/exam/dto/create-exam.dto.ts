import {
  Min,
  Max,
  Matches,
  IsNumber,
  Validate,
  IsBoolean,
  IsOptional,
} from "class-validator";
import { isValid } from "date-fns";
//////////////////////////////////////////////////////////////////////////////////////

export class CreateExamDto {
  @Matches(/^[a-zA-ZÀ-ÖØ-öø-ÿ0-9\s]{3,20}$/, {
    message: "Title must be between 3 and 20 characters long.",
  })
  title: string;

  @IsOptional()
  @Matches(/^[a-zA-ZÀ-ÖØ-öø-ÿ0-9\s]{3,20}$/, {
    message: "Title must be between 3 and 20 characters long.",
  })
  subtitle?: string;

  @IsOptional()
  @Matches(/^[a-zA-ZÀ-ÖØ-öø-ÿ\s]{3,20}$/, {
    message:
      "Level must be between 3 and 20 characters long and contain only letters. If number is required, please use roman numerals or contact support.",
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
