/** nestjs */
import { TypeOrmModule } from "@nestjs/typeorm";
import { Module, forwardRef } from "@nestjs/common";

/** modules */
import { ExamModule } from "../exam/exam.module";

/** controllers */
import { ExamInvitationController } from "./exam-invitation.controller";

/** providers */
import { ExamInvitationService } from "./exam-invitation.service";
import { QueryRunnerService } from "../query-runner/query-runner.service";

/** entities */
import { ExamInvitation } from "./entities/exam-invitation.entity";
//////////////////////////////////////////////////////////////////////////////////////

@Module({
  imports: [
    forwardRef(() => ExamModule),
    TypeOrmModule.forFeature([ExamInvitation]),
  ],
  controllers: [ExamInvitationController],
  providers: [ExamInvitationService, QueryRunnerService],
  exports: [ExamInvitationService],
})
export class ExamInvitationModule {}
