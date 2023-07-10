/** nestjs */
import { Module, forwardRef } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

/** modules */
import { ExamModule } from "../exam/exam.module";

/** controllers */
import { ExamInvitationController } from "./exam-invitation.controller";

/** providers */
import { ExamInvitationService } from "./exam-invitation.service";
import { QueryRunnerFactory } from "../utils/query-runner.factory";

/** entities & dtos */
import { ExamInvitation } from "./entities/exam-invitation.entity";
//////////////////////////////////////////////////////////////////////////////////////

@Module({
  imports: [
    forwardRef(() => ExamModule),
    TypeOrmModule.forFeature([ExamInvitation]),
  ],
  controllers: [ExamInvitationController],
  providers: [ExamInvitationService, QueryRunnerFactory],
  exports: [ExamInvitationService],
})
export class ExamInvitationModule {}
