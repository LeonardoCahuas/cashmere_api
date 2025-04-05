import { Injectable, UnauthorizedException, type ExecutionContext } from "@nestjs/common"
import { AuthGuard } from "@nestjs/passport"
import type { JwtService } from "@nestjs/jwt"
import type { Request } from "express"

@Injectable()
export class JwtAuthGuard extends AuthGuard("jwt") {
  constructor(private jwtService: JwtService) {
    super()
  }

  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest()
    console.log("JwtAuthGuard - Checking token")

    // Log dettagliato per debug
    console.log("Headers:", request.headers)
    console.log("Cookies:", request.cookies)

    return super.canActivate(context)
  }

  handleRequest(err: any, user: any, info: any) {
    console.log("JwtAuthGuard - Handle Request:", { err, user, info })

    if (err || !user) {
      console.log("JwtAuthGuard - Authentication failed:", { err, info })
      throw err || new UnauthorizedException("Authentication failed")
    }

    console.log("JwtAuthGuard - Authentication successful:", user)
    return user
  }
}

