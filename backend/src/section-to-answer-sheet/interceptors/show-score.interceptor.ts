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
      map(async (data) => {
        if (!user.roles.includes("candidate")) return data;

        const section = await (await data).section;
        const exam = await section.exam;
        if (exam.showScore) return data;

        delete data.aiScore;
        delete data.revisedScore;

        if (data["__answerSheet__"]) {
          delete data["__answerSheet__"].aiScore;
          delete data["__answerSheet__"].revisedScore;
        }

        if (data["__answers__"]) {
          for (const answer of data["__answers__"]) {
            delete answer.aiScore;
            delete answer.revisedScore;
            delete answer.aiFeedback;
            delete answer.revisedFeedback;
          }
        }

        return data;
      })
    );
  }
}
