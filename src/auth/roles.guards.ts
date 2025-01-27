import { Injectable, CanActivate, ExecutionContext, UnauthorizedException, ForbiddenException } from "@nestjs/common"
import { Reflector } from "@nestjs/core"
import { Role } from "@prisma/client"
import { ROLES_KEY } from "./roles.decorator"

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}
  
  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ])

    console.log('Required roles:', requiredRoles);

    if (!requiredRoles) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    console.log(request)
    console.log('Full request:', {
      headers: request.headers,
      user: request.user
    });

    if (!request.user) {
      throw new UnauthorizedException('User not found in request');
    }

    const hasRole = requiredRoles.some((role) => request.user.role === role);
    console.log('User role:', request.user.role);
    console.log('Has required role:', hasRole);

    if (!hasRole) {
      throw new ForbiddenException(`User role ${request.user.role} not authorized. Required roles: ${requiredRoles.join(', ')}`);
    }

    return true;
  }
}

