/** nestjs */
import { TypeOrmModule } from "@nestjs/typeorm";
import { Module, Global } from "@nestjs/common";

/** modules */
import { ExamModule } from "../exam/exam.module";
import { ExamInvitationModule } from "../exam-invitation/exam-invitation.module";
import { AnswerSheetModule } from "../answer-sheet/answer-sheet.module";

/** controllers */
import { UserController } from "./user.controller";

/** providers */
import { UserService } from "./user.service";
import { QueryRunnerFactory } from "../utils/query-runner.factory";

/** entities */
import { User } from "./entities/user.entity";
////////////////////////////////////////////////////////////////////////////////

@Global()
@Module({
  imports: [
    ExamModule,
    AnswerSheetModule,
    ExamInvitationModule,
    TypeOrmModule.forFeature([User]),
  ],
  controllers: [UserController],
  providers: [UserService, QueryRunnerFactory],
  exports: [UserService],
})
export class UserModule {}
