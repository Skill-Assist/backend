import { ObjectId } from "typeorm";
import { Type } from "class-transformer";
import { IsArray, IsMongoId, IsNumber, ValidateNested } from "class-validator";
//////////////////////////////////////////////////////////////////////////////////////

class QuestionItem {
  @IsMongoId()
  id: string | ObjectId;

  @IsNumber()
  weight: number;
}

export class AddQuestionDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QuestionItem)
  questions: QuestionItem[];
}
