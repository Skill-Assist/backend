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
        console.log("data", data.deadline);

        data.isExpired = data.deadline ? data.deadline < Date.now() : false;

        return data;
      })
    );
  }
}
