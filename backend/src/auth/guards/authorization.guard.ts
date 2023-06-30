import { Observable } from "rxjs";
import { Injectable, CanActivate, ExecutionContext } from "@nestjs/common";
////////////////////////////////////////////////////////////////////////////////

@Injectable()
export class AuthGuard implements CanActivate {
  canActivate(
    context: ExecutionContext
  ): boolean | Promise<boolean> | Observable<boolean> {
    const request = context.switchToHttp().getRequest();
    return validateRequest(request);
  }
}

function validateRequest(request: any): boolean {
  // do something
  return true;
}
