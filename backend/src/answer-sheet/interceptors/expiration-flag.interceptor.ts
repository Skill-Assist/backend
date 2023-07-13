import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from "@nestjs/common";
import { map } from "rxjs/operators";
////////////////////////////////////////////////////////////////////////////////

@Injectable()
export class ExpirationFlagInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): any {
    return next.handle().pipe(
      map((data) => {
        let updatedData: any[] = [];

        if (data.length) {
          for (const answerSheet of data) {
            answerSheet.isExpired = data.deadline
              ? data.deadline < Date.now()
              : false;
            updatedData.push(answerSheet);
          }
        } else {
          data.isExpired = data.deadline ? data.deadline < Date.now() : false;

          updatedData.push(data);
        }

        return updatedData;
      })
    );
  }
}
