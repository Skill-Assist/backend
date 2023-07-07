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

export class CreateSectionDto {
  @Matches(/^[a-zA-ZÀ-ÖØ-öø-ÿ0-9\s]{3,50}$/, {
    message: "Name must be between 3 and 50 characters long.",
  })
  name: string;

  @Matches(/^[a-zA-ZÀ-ÖØ-öø-ÿ0-9\s]{15,100}$/, {
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
