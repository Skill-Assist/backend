import { ObjectId } from "typeorm";
import { IsArray, IsMongoId } from "class-validator";
//////////////////////////////////////////////////////////////////////////////////////

export class AddQuestionDto {
  @IsArray()
  @IsMongoId({ each: true })
  questionId: (string | ObjectId)[];
}
