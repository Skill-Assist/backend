/** nestjs */
import { TypeOrmModule } from "@nestjs/typeorm";
import { forwardRef, Module } from "@nestjs/common";

/** modules */
import { AnswerSheetModule } from "../answer-sheet/answer-sheet.module";
import { ExamInvitationModule } from "../exam-invitation/exam-invitation.module";

/** controllers */
import { ExamController } from "./exam.controller";

/** providers */
import { ExamService } from "./exam.service";
import { QueryRunnerService } from "../query-runner/query-runner.service";

/** entities */
import { Exam } from "./entities/exam.entity";
////////////////////////////////////////////////////////////////////////////////

@Module({
  imports: [
    AnswerSheetModule,
    TypeOrmModule.forFeature([Exam]),
    forwardRef(() => ExamInvitationModule),
  ],
  controllers: [ExamController],
  providers: [ExamService, QueryRunnerService],
  exports: [ExamService],
})
export class ExamModule {}
