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
    ThrottlerModule.forRoot([{  ttl: 60, limit: 250}]),
    /** see https://typeorm.io/data-source-options */
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => {
        const nodeEnv = configService.get<string>("NODE_ENV");

        let user, pass, host;

        switch(nodeEnv) {
          case "prod":
            host = configService.get<string>("MYSQL_HOST");
            user = configService.get<string>("MYSQL_USER");
            pass = configService.get<string>("MYSQL_ROOT_PASS");
            break;
          case "dev":
            host = "mysql";
            user = "root";
            pass = "password";
            break;
          case "test":
            host = "localhost";
            user = "root";
            pass = "password";
            break;
          default:
            console.log("NODE_ENV is not set. Exiting...");
            process.exit(1);
        }

        return {
          type: "mysql",
          host: host,
          port: 3306,
          username: user,
          password: pass,
          database: "db",
          autoLoadEntities: true,
          cache: { duration: 30000 },
          synchronize: nodeEnv === "prod" ? false : true,
        };
      },
    }),
    /** see https://docs.nestjs.com/techniques/mongodb */
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const nodeEnv = configService.get<string>("NODE_ENV");
        
        let uri;
        
        switch(nodeEnv) {
          case "prod":
              const user = configService.get<string>("MONGO_USER");
              const pass = configService.get<string>("MONGO_USER_PASS");
              const host = configService.get<string>("MONGO_HOST");
              uri = `mongodb+srv://${user}:${pass}@${host}/database?retryWrites=true&w=majority`;
              break;
          case "dev":
            uri = "mongodb://username:password@mongodb:27017/database?authSource=admin";
            break;
          case "test":
            uri = "mongodb://127.0.0.1:27017/database";
            break;
          default:
            console.log("NODE_ENV is not set. Exiting...");
            process.exit(1);
          }

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
