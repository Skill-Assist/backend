/** nestjs */
import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

/** modules */
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
  imports: [ExamInvitationModule, TypeOrmModule.forFeature([Exam])],
  controllers: [ExamController],
  providers: [ExamService, QueryRunnerService],
  exports: [ExamService],
})
export class ExamModule {}
