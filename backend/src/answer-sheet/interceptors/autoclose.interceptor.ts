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
////////////////////////////////////////////////////////////////////////////////

@Injectable()
export class AutocloseInterceptor implements NestInterceptor {
  constructor(
    private readonly answerSheetService: AnswerSheetService,
    private readonly sectionToAnswerSheetService: SectionToAnswerSheetService
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): any {
    const userId = context.switchToHttp().getRequest().user.id;

    return next.handle().pipe(
      map(async (data) => {
        let updatedData: any[] = [];
        if (data.length) {
          for (const answerSheet of data) {
            updatedData.push(await this.autoclose(answerSheet, userId));
          }
        } else {
          updatedData.push(await this.autoclose(data, userId));
          console.log(updatedData);
        }

        return updatedData;
      })
    );
  }

  async autoclose(data: any, userId: number): Promise<any> {
    if (!data.deadline || new Date(data.deadline) > new Date()) {
      return data;
    }

    const answerSheet = await this.answerSheetService.findOne(
      userId,
      "id",
      data.id
    );

    for (const sas of await answerSheet.sectionToAnswerSheets) {
      if (!sas.endDate)
        await this.sectionToAnswerSheetService.submit(userId, sas.id);
    }

    return await this.answerSheetService.submitAndGetEval(userId, data.id);
  }
}
