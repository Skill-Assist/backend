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
    const invocation = context
      .switchToHttp()
      .getRequest()
      .route.path.split("/")
      .pop();

    return next.handle().pipe(
      map(async (data) => {
        if (!user.roles.includes("candidate")) return data;

        if (invocation === "fetchSections") {
          if (!(await data)["__exam__"].showScore) {
            delete data.aiScore;
            delete data.revisedScore;
          }

          return data;
        }

        if (invocation === "fetchOwn" || invocation === "findOne") {
          const _data = await data;
          for (const key in _data) {
            if ((await _data[key].exam).showScore) continue;

            delete _data[key].aiScore;
            delete _data[key].revisedScore;

            for (const key2 in _data[key]["__sectionToAnswerSheets__"]) {
              delete _data[key]["__sectionToAnswerSheets__"][key2].aiScore;
              delete _data[key]["__sectionToAnswerSheets__"][key2].revisedScore;
            }
          }

          return _data;
        }

        return data;
      })
    );
  }
}
