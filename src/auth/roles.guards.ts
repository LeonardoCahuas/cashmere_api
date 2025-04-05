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

    if (!requiredRoles) {
      return true
    }

    const request = context.switchToHttp().getRequest()

    // In ambiente di produzione, verifichiamo rigorosamente l'utente
    if (process.env.NODE_ENV === "production" && !request.user) {
      console.log("User not found in request in production environment")
      throw new UnauthorizedException("Authentication required")
    }

    // In ambiente di sviluppo, possiamo essere più permissivi
    if (!request.user) {
      if (process.env.NODE_ENV !== "production") {
        console.log("User not found in request, but allowing access in development")
        return true
      }
      throw new UnauthorizedException("Authentication required")
    }

    const hasRole = requiredRoles.some((role) => request.user.role === role)

    if (!hasRole) {
      if (process.env.NODE_ENV !== "production") {
        console.log(`User role ${request.user.role} not authorized, but allowing access in development`)
        return true
      }
      throw new ForbiddenException(
        `User role ${request.user.role} not authorized. Required roles: ${requiredRoles.join(", ")}`,
      )
    }

    return true
  }
}

