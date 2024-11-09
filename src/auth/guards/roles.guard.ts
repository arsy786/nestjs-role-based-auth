import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '../../common/enums/role.enum';

// A guard that checks whether the authenticated user has the required roles
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  // Determines if the current user has the required roles to access the route
  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>('roles', [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles) {
      // No roles required, allow access
      return true;
    }
    const { user } = context.switchToHttp().getRequest();
    // Check if the user has the required role
    return requiredRoles.some((role) => user?.roles?.includes(role));
  }
}
