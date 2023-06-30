/** nestjs */
import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

/** modules */
import { ExamModule } from "../exam/exam.module";

/** controllers */
import { AnswerSheetController } from "./answer-sheet.controller";

/** providers */
import { AnswerSheetService } from "./answer-sheet.service";
import { QueryRunnerFactory } from "../utils/query-runner.factory";

/** dependencies */
import { AnswerSheet } from "./entities/answer-sheet.entity";
////////////////////////////////////////////////////////////////////////////////

@Module({
  imports: [ExamModule, TypeOrmModule.forFeature([AnswerSheet])],
  controllers: [AnswerSheetController],
  providers: [AnswerSheetService, QueryRunnerFactory],
  exports: [AnswerSheetService],
})
export class AnswerSheetModule {}
