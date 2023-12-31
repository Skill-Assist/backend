/** nestjs */
import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { MongooseModule } from "@nestjs/mongoose";
import { APP_GUARD, APP_INTERCEPTOR } from "@nestjs/core";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { ThrottlerModule, ThrottlerGuard } from "@nestjs/throttler";

/** modules */
import { AwsModule } from "./aws/aws.module";
import { AuthModule } from "./auth/auth.module";
import { ExamModule } from "./exam/exam.module";
import { UserModule } from "./user/user.module";
import { HealthModule } from "./health/health.module";
import { AnswerModule } from "./answer/answer.module";
import { NaturalLanguageModule } from "./nlp/nlp.module";
import { SectionModule } from "./section/section.module";
import { QuestionModule } from "./question/question.module";
import { AnswerSheetModule } from "./answer-sheet/answer-sheet.module";
import { QueryRunnerModule } from "./query-runner/query-runner.module";
import { ExamInvitationModule } from "./exam-invitation/exam-invitation.module";
import { SectionToAnswerSheetModule } from "./section-to-answer-sheet/section-to-answer-sheet.module";

/** interceptors */
import { AppInterceptor } from "./app.interceptor";
////////////////////////////////////////////////////////////////////////////////

@Module({
  imports: [
    AwsModule,
    UserModule,
    AuthModule,
    ExamModule,
    HealthModule,
    AnswerModule,
    SectionModule,
    QuestionModule,
    AnswerSheetModule,
    QueryRunnerModule,
    ExamInvitationModule,
    NaturalLanguageModule,
    SectionToAnswerSheetModule,
    /** runtime environment variables (e.g. OS shell exports) take precedence */
    // TODO : schema validation (see https://docs.nestjs.com/techniques/configuration#schema-validation)
    ConfigModule.forRoot({
      cache: true,
      isGlobal: true,
      // ignoreEnvFile: process.env.NODE_ENV === "prod" ? true : false,
    }),
    /** see https://docs.nestjs.com/security/rate-limiting */
    ThrottlerModule.forRoot({
      ttl: 60,
      limit: 250,
    }),
    /** see https://typeorm.io/data-source-options */
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => {
        const user = configService.get<string>("MYSQL_USER");
        const pass = configService.get<string>("MYSQL_ROOT_PASS");
        const host = configService.get<string>("MYSQL_HOST");
        const script = configService.get<string>("npm_lifecycle_script");

        // gracefully shutdown if NODE_ENV is not set
        if (!script?.includes("NODE_ENV")) {
          console.log("NODE_ENV is not set. Exiting...");
          process.exit(1);
        }

        return {
          type: "mysql",
          host: script.includes("prod") ? host : "mysql",
          port: 3306,
          username: script.includes("prod") ? user : "root",
          password: script.includes("prod") ? pass : "password",
          database: "db",
          autoLoadEntities: true,
          cache: { duration: 30000 },
          synchronize: script.includes("prod") ? false : true,
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
        const script = configService.get<string>("npm_lifecycle_script");

        // gracefully shutdown if NODE_ENV is not set
        if (!script?.includes("NODE_ENV")) {
          console.log("NODE_ENV is not set. Exiting...");
          process.exit(1);
        }

        const uri = script.includes("prod")
          ? `mongodb+srv://${user}:${pass}@${host}/database?retryWrites=true&w=majority`
          : `mongodb://username:password@mongodb:27017/database?authSource=admin`;

        return { uri };
      },
    }),
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: AppInterceptor,
    },
  ],
})
export class AppModule {}
