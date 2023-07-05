import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { UserRole } from "../entities/user.entity";
import { ROLES_KEY } from "../decorators/roles.decorator";
//////////////////////////////////////////////////////////////////////////////////////

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // get required roles from the handler or class
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()]
    );

    // if no roles are required, allow access
    if (!requiredRoles) return true;

    // check if user has at least one of the required roles
    const { user } = context.switchToHttp().getRequest();
    const allowAccess = requiredRoles.some((role) =>
      user.roles?.includes(role)
    );

    if (!allowAccess)
      throw new UnauthorizedException(
        "You do not have permission to access this resource."
      );

    return true;
  }
}
