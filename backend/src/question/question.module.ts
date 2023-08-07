/** nestjs */
import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";

/** modules */
import { NaturalLanguageModule } from "../nlp/nlp.module";
import { SectionModule } from "../section/section.module";

/** controllers */
import { QuestionController } from "./question.controller";

/** providers */
import { QuestionService } from "./question.service";

/** dependencies */
import { Question, QuestionSchema } from "./schemas/question.schema";
////////////////////////////////////////////////////////////////////////////////

@Module({
  imports: [
    SectionModule,
    NaturalLanguageModule,
    MongooseModule.forFeature([
      { name: Question.name, schema: QuestionSchema },
    ]),
  ],
  controllers: [QuestionController],
  providers: [QuestionService],
  exports: [QuestionService],
})
export class QuestionModule {}
