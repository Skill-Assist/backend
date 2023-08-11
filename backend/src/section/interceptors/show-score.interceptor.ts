import {
  Injectable,
  CallHandler,
  NestInterceptor,
  ExecutionContext,
} from "@nestjs/common";
import { map } from "rxjs/operators";
import { User } from "../../user/entities/user.entity";
import { SectionService } from "../section.service";
////////////////////////////////////////////////////////////////////////////////

@Injectable()
export class ShowScoreInterceptor implements NestInterceptor {
  constructor(private readonly sectionService: SectionService) {}

  intercept(context: ExecutionContext, next: CallHandler): any {
    const user: User = context.switchToHttp().getRequest().user;

    return next.handle().pipe(
      map(async (data) => {
        if (
          !user.roles.includes("candidate") ||
          !data["__sectionToAnswerSheets__"]
        )
          return data;

        const exam = await (
          await this.sectionService.findOne(user.id, "id", data.id)
        ).exam;

        if (exam.showScore) return data;

        for (const key in data["__sectionToAnswerSheets__"]) {
          delete data["__sectionToAnswerSheets__"][key].aiScore;
          delete data["__sectionToAnswerSheets__"][key].revisedScore;
        }

        return data;
      })
    );
  }
}
