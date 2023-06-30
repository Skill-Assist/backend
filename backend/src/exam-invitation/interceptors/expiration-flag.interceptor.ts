import {
  Injectable,
  CallHandler,
  NestInterceptor,
  ExecutionContext,
} from "@nestjs/common";
import { Observable } from "rxjs";
import { map } from "rxjs/operators";
////////////////////////////////////////////////////////////////////////////////

export interface Response<T> {
  data: T;
}

@Injectable()
export class ExpirationFlagInterceptor<T>
  implements NestInterceptor<T, Response<T>>
{
  intercept(
    context: ExecutionContext,
    next: CallHandler
  ): Observable<Response<T>> {
    return next.handle().pipe(
      map((data) => {
        for (const key in data) {
          data[key].isExpired =
            data[key].createdAt.getTime() +
              data[key].expirationInHours * 60 * 60 * 1000 <
            Date.now();
        }

        return {
          data,
        };
      })
    );
  }
}
