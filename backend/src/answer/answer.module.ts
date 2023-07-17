/** nestjs */
import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

/** modules */
import { OpenaiModule } from "../openai/openai.module";
import { QuestionModule } from "../question/question.module";
import { SectionToAnswerSheetModule } from "../section-to-answer-sheet/section-to-answer-sheet.module";

/** controllers */
import { AnswerController } from "./answer.controller";

/** services */
import { AnswerService } from "./answer.service";
import { QueryRunnerService } from "../query-runner/query-runner.service";

/** entities */
import { Answer } from "./entities/answer.entity";
////////////////////////////////////////////////////////////////////////////////

@Module({
  imports: [
    OpenaiModule,
    QuestionModule,
    SectionToAnswerSheetModule,
    TypeOrmModule.forFeature([Answer]),
  ],
  controllers: [AnswerController],
  providers: [AnswerService, QueryRunnerService],
  exports: [AnswerService],
})
export class AnswerModule {}
