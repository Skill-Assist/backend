/** nestjs */
import { TypeOrmModule } from "@nestjs/typeorm";
import { Module, Global } from "@nestjs/common";

/** modules */
import { ExamModule } from "../exam/exam.module";
import { AwsModule } from "../aws/aws.module";
import { AnswerSheetModule } from "../answer-sheet/answer-sheet.module";
import { ExamInvitationModule } from "../exam-invitation/exam-invitation.module";

/** controllers */
import { UserController } from "./user.controller";

/** providers */
import { UserService } from "./user.service";
import { QueryRunnerService } from "../query-runner/query-runner.service";

/** entities */
import { User } from "./entities/user.entity";
////////////////////////////////////////////////////////////////////////////////

@Global()
@Module({
  imports: [
    AwsModule,
    ExamModule,
    AnswerSheetModule,
    ExamInvitationModule,
    TypeOrmModule.forFeature([User]),
  ],
  controllers: [UserController],
  providers: [UserService, QueryRunnerService],
  exports: [UserService],
})
export class UserModule {}
