import {
  Injectable,
  CallHandler,
  NestInterceptor,
  ExecutionContext,
} from "@nestjs/common";
import { map } from "rxjs/operators";
import { User } from "../../user/entities/user.entity";
////////////////////////////////////////////////////////////////////////////////

@Injectable()
export class ShowScoreInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): any {
    const user: User = context.switchToHttp().getRequest().user;

    return next.handle().pipe(
      map((data) => {
        if (
          !user.roles.includes("candidate") ||
          !data["__answerSheets__"] ||
          data.showScore
        )
          return data;

        for (const key in data["__answerSheets__"]) {
          delete data["__answerSheets__"][key].aiScore;
          delete data["__answerSheets__"][key].revisedScore;
        }

        return data;
      })
    );
  }
}
