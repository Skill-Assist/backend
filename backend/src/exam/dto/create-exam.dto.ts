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
  @Matches(/^[a-zA-Z\s]{3,20}$/, {
    message:
      "Title must be between 3 and 20 characters long and contain only letters",
  })
  title: string;

  @IsOptional()
  @Matches(/^[a-zA-Z\s]{3,20}$/, {
    message:
      "Title must be between 3 and 20 characters long and contain only letters",
  })
  subtitle?: string;

  @IsOptional()
  @Matches(/^[a-zA-Z\s]{3,20}$/, {
    message:
      "Level must be between 3 and 20 characters long and contain only letters. If number is required, please use roman numerals or contact user support.",
  })
  level?: string;

  @Min(1)
  @Max(24 * 7 * 4)
  @IsNumber()
  durationInHours: number;

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
