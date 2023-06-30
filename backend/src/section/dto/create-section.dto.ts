import {
  Max,
  Matches,
  IsNumber,
  Validate,
  IsBoolean,
  IsOptional,
} from "class-validator";
import { isValid } from "date-fns";
//////////////////////////////////////////////////////////////////////////////////////

export class CreateSectionDto {
  @Matches(/^[a-zA-ZÀ-ÖØ-öø-ÿ\s]{3,20}$/, {
    message:
      "Name must be between 3 and 20 characters long and contain only letters",
  })
  name: string;

  @Matches(/^[a-zA-ZÀ-ÖØ-öø-ÿ\s]{15,100}$/, {
    message:
      "Description must be between 15 and 100 characters long and contain only letters. If number is required, please use roman numerals or contact user support.",
  })
  description: string;

  @IsOptional()
  @Validate((value: Date) => isValid(value))
  startDate?: Date;

  @IsOptional()
  @Max(24 * 7 * 4)
  @IsNumber()
  durationInHours?: number;

  @IsOptional()
  @IsBoolean()
  isShuffleQuestions?: boolean;

  @IsOptional()
  @IsBoolean()
  hasProctoring?: boolean;
}
