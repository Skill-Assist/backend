/** nestjs */
import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

/** controllers */
import { ExamInvitationController } from "./exam-invitation.controller";

/** providers */
import { ExamInvitationService } from "./exam-invitation.service";
import { QueryRunnerFactory } from "../utils/query-runner.factory";

/** entities & dtos */
import { ExamInvitation } from "./entities/exam-invitation.entity";
//////////////////////////////////////////////////////////////////////////////////////

@Module({
  imports: [TypeOrmModule.forFeature([ExamInvitation])],
  controllers: [ExamInvitationController],
  providers: [ExamInvitationService, QueryRunnerFactory],
  exports: [ExamInvitationService],
})
export class ExamInvitationModule {}
