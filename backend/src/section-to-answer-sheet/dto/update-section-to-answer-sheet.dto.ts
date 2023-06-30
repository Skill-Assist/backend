import { isValid } from "date-fns";
import { Validate } from "class-validator";
//////////////////////////////////////////////////////////////////////////////////////

export class UpdateSectionToAnswerSheetDto {
  @Validate((value: Date) => isValid(value))
  endDate: Date;
}
