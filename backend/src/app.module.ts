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
import { HealthModule } from "./health/health.module";
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
        const user = configService.get<string>("MYSQL_USER");
        const pass = configService.get<string>("MYSQL_ROOT_PASS");
        const host = configService.get<string>("MYSQL_HOST");
        const db = configService.get<string>("MYSQL_DATABASE");
        return {
          type: "mysql",
          host: host,
          port: 3306,
          username: user,
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
      useFactory: (configService: ConfigService) => {
        const user = configService.get<string>("MONGO_USER");
        const pass = configService.get<string>("MONGO_USER_PASS");
        const host = configService.get<string>("MONGO_HOST");
        const db = configService.get<string>("MONGO_DATABASE");
        const script = configService.get<string>("npm_lifecycle_script");

        // gracefully shutdown if NODE_ENV is not set
        if (!script?.includes("NODE_ENV")) {
          console.log("NODE_ENV is not set. Exiting...");
          process.exit(1);
        }

        switch (script.includes("dev")) {
          case true:
            return {
              uri: `mongodb://${user}:${pass}@${host}:27017/${db}?authSource=admin`,
            };
          case false:
            return {
              uri: `mongodb+srv://${user}:${pass}@${host}/`,
            };
          default:
            return {
              uri: `mongodb://${user}:${pass}@${host}:27017/${db}?authSource=admin`,
            };
        }
      },
    }),
    HealthModule,
  ],
})
export class AppModule {}
