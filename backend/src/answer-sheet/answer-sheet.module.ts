/** nestjs */
import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

/** modules */
import { ExamModule } from "../exam/exam.module";
import { AnswerModule } from "../answer/answer.module";
import { SectionToAnswerSheetModule } from "../section-to-answer-sheet/section-to-answer-sheet.module";

/** controllers */
import { AnswerSheetController } from "./answer-sheet.controller";

/** providers */
import { AnswerSheetService } from "./answer-sheet.service";
import { QueryRunnerFactory } from "../utils/query-runner.factory";

/** dependencies */
import { AnswerSheet } from "./entities/answer-sheet.entity";
////////////////////////////////////////////////////////////////////////////////

@Module({
  imports: [
    ExamModule,
    AnswerModule,
    SectionToAnswerSheetModule,
    TypeOrmModule.forFeature([AnswerSheet]),
  ],
  controllers: [AnswerSheetController],
  providers: [AnswerSheetService, QueryRunnerFactory],
  exports: [AnswerSheetService],
})
export class AnswerSheetModule {}
