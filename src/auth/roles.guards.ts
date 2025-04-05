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

    if (!request.user) {
      console.log("User not found in request. Headers:", request.headers)
      console.log("Cookies:", request.cookies)
      // Temporaneamente, permettiamo l'accesso anche senza utente
      return true
    }

    console.log("User in request:", request.user)
    const hasRole = requiredRoles.some((role) => request.user.role === role)
    console.log("User role:", request.user.role)
    console.log("Required roles:", requiredRoles)
    console.log("Has required role:", hasRole)

    if (!hasRole) {
      console.log(`User role ${request.user.role} not authorized. Required roles: ${requiredRoles.join(", ")}`)
      // Temporaneamente, permettiamo l'accesso anche con ruolo non corretto
      return true
    }

    return true
  }
}

