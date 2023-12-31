/** nestjs */
import {
  Injectable,
  CallHandler,
  NestInterceptor,
  ExecutionContext,
} from "@nestjs/common";

/** external dependencies */
import { map } from "rxjs/operators";

/** providers */
import { AnswerSheetService } from "../answer-sheet.service";
import { SectionToAnswerSheetService } from "../../section-to-answer-sheet/section-to-answer-sheet.service";

/** entities */
import { AnswerSheet } from "../entities/answer-sheet.entity";
////////////////////////////////////////////////////////////////////////////////

@Injectable()
export class AutocloseInterceptor implements NestInterceptor {
  constructor(
    private readonly answerSheetService: AnswerSheetService,
    private readonly sectionToAnswerSheetService: SectionToAnswerSheetService
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): any {
    const userId: number = context.switchToHttp().getRequest().user.id;

    return next.handle().pipe(
      map(async (data) => {
        for (const [idx, answerSheet] of data.entries()) {
          const updatedAnswerSheet: AnswerSheet = await this.autoclose(
            answerSheet,
            userId
          );

          data.splice(idx, 1, updatedAnswerSheet);
        }

        return data;
      })
    );
  }

  async autoclose(as: AnswerSheet, userId: number): Promise<AnswerSheet> {
    if (as.endDate || !as.deadline || new Date(as.deadline) > new Date())
      return as;

    const answerSheet = await this.answerSheetService.findOne(
      userId,
      "id",
      as.id
    );

    for (const sas of await answerSheet.sectionToAnswerSheets) {
      if (!sas.endDate)
        await this.sectionToAnswerSheetService.submit(userId, sas.id);
    }

    await this.answerSheetService.submit(userId, as.id);

    return await this.answerSheetService.findOne(userId, "id", as.id);
  }
}
