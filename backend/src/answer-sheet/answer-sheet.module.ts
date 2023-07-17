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
import { QueryRunnerService } from "../query-runner/query-runner.service";

/** entities */
import { AnswerSheet } from "./entities/answer-sheet.entity";

/** interceptors */
import { AutocloseInterceptor } from "./interceptors/autoclose.interceptor";
////////////////////////////////////////////////////////////////////////////////

@Module({
  imports: [
    ExamModule,
    AnswerModule,
    SectionToAnswerSheetModule,
    TypeOrmModule.forFeature([AnswerSheet]),
  ],
  controllers: [AnswerSheetController],
  providers: [AutocloseInterceptor, AnswerSheetService, QueryRunnerService],
  exports: [AnswerSheetService],
})
export class AnswerSheetModule {}
