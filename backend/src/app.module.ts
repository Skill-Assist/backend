/** nestjs */
import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { MongooseModule } from "@nestjs/mongoose";
import { ConfigModule, ConfigService } from "@nestjs/config";

/** modules */
import { AuthModule } from "./auth/auth.module";
import { ExamModule } from "./exam/exam.module";
import { UserModule } from "./user/user.module";
import { AnswerModule } from "./answer/answer.module";
import { OpenaiModule } from "./openai/openai.module";
import { SectionModule } from "./section/section.module";
import { QuestionModule } from "./question/question.module";
import { AnswerSheetModule } from "./answer-sheet/answer-sheet.module";
import { ExamInvitationModule } from "./exam-invitation/exam-invitation.module";
import { SectionToAnswerSheetModule } from "./section-to-answer-sheet/section-to-answer-sheet.module";
////////////////////////////////////////////////////////////////////////////////

@Module({
  imports: [
    UserModule,
    AuthModule,
    ExamModule,
    OpenaiModule,
    AnswerModule,
    SectionModule,
    QuestionModule,
    AnswerSheetModule,
    ExamInvitationModule,
    SectionToAnswerSheetModule,
    /** runtime environment variables (e.g. OS shell exports) take precedence */
    // TODO : schema validation (see https://docs.nestjs.com/techniques/configuration#schema-validation)
    ConfigModule.forRoot({
      cache: true,
      isGlobal: true,
      ignoreEnvFile: process.env.NODE_ENV === "prod" ? true : false,
    }),
    /** see https://typeorm.io/data-source-options */
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => {
        const pass = configService.get<string>("MYSQL_ROOT_PASS");
        const db = configService.get<string>("MYSQL_DATABASE");
        return {
          type: "mysql",
          host: "mysql",
          port: 3306,
          username: "root",
          password: pass,
          database: db,
          autoLoadEntities: true,
          cache: { duration: 30000 },
          synchronize: process.env.NODE_ENV === "prod" ? false : true,
        };
      },
    }),
    /** see https://docs.nestjs.com/techniques/mongodb */
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => {
        const user = configService.get<string>("MONGO_USER");
        const pass = configService.get<string>("MONGO_USER_PASS");
        return {
          uri: `mongodb://${user}:${pass}@mongodb:27017/skill-assist?authSource=admin`,
        };
      },
    }),
  ],
})
export class AppModule {}
