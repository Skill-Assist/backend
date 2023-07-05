import {
  Injectable,
  CallHandler,
  NestInterceptor,
  ExecutionContext,
} from "@nestjs/common";
// import { Observable } from "rxjs";
import { map } from "rxjs/operators";
////////////////////////////////////////////////////////////////////////////////

export interface Response<T> {
  data: T;
}

@Injectable()
export class ExpirationFlagInterceptor<T>
  implements NestInterceptor<T, Response<T>>
{
  intercept(context: ExecutionContext, next: CallHandler): any {
    return next.handle().pipe(
      map(async (data) => {
        let submissionDeadline: number;

        for (const key in data) {
          submissionDeadline = (await data[key].exam).submissionInHours;

          data[key].isExpired =
            data[key].createdAt.getTime() +
              data[key].expirationInHours * 60 * 60 * 1000 <
            Date.now();

          data[key].submissionDeadline = new Date(
            submissionDeadline * 60 * 60 * 1000 + data[key].createdAt.getTime()
          );
        }

        const dataWithoutProperties = data.map((item: any) => {
          const {
            __exam__,
            __has_exam__,
            updatedAt,
            deletedAt,
            version,
            ...itemWithoutProperties
          } = item;
          return itemWithoutProperties;
        });

        return dataWithoutProperties;
      })
    );
  }
}
