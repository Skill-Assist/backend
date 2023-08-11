import {
  Injectable,
  CallHandler,
  NestInterceptor,
  ExecutionContext,
} from "@nestjs/common";
import { map } from "rxjs/operators";
////////////////////////////////////////////////////////////////////////////////

@Injectable()
export class ShowScoreInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): any {
    const user = context.switchToHttp().getRequest().user;

    return next.handle().pipe(
      map((data) => {
        if (!user.roles.includes("candidate")) return data;

        for (const key of data.invitationsRef) {
          const exam = key.examRef;
          const answerSheet = exam.answerSheetsRef;
          if (exam.showScore || !answerSheet) continue;

          delete key.examRef.answerSheetsRef.aiScore;
          delete key.examRef.answerSheetsRef.revisedScore;
        }

        return data;
      })
    );
  }
}
