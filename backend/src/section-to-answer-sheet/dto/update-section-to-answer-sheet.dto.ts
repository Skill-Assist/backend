import { isValid } from "date-fns";
import { Min, Max, Validate } from "class-validator";
//////////////////////////////////////////////////////////////////////////////////////

export class UpdateSectionToAnswerSheetDto {
  @Validate((value: Date) => isValid(value))
  endDate?: Date;

  @Validate((value: Date) => isValid(value))
  deadline?: Date;

  @Max(1)
  @Min(0)
  aiScore?: number;
}
