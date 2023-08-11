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

        const sas = await (await data).sectionToAnswerSheet;
        const section = await sas.section;
        const exam = await section.exam;
        if (exam.showScore) return data;

        delete data.aiScore;
        delete data.revisedScore;
        delete data.aiFeedback;
        delete data.revisedFeedback;

        if (data["__sectionToAnswerSheet__"]) {
          delete data["__sectionToAnswerSheet__"].aiScore;
          delete data["__sectionToAnswerSheet__"].revisedScore;
        }

        return data;
      })
    );
  }
}
