/** nestjs */
import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";

/** modules */
import { OpenaiModule } from "../openai/openai.module";
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
    OpenaiModule,
    SectionModule,
    MongooseModule.forFeature([
      { name: Question.name, schema: QuestionSchema },
    ]),
  ],
  controllers: [QuestionController],
  providers: [QuestionService],
  exports: [QuestionService],
})
export class QuestionModule {}
