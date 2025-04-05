import { ExtractJwt, Strategy } from "passport-jwt"
import { PassportStrategy } from "@nestjs/passport"
import { Injectable, UnauthorizedException } from "@nestjs/common"
import type { Request } from "express"

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (request: Request) => {
          // First try to get token from cookie
          const token = request?.cookies?.token
          if (token) {
            console.log("Token trovato nei cookie:", token.substring(0, 20) + "...")
            return token
          }

          // Fallback to Authorization header
          const authHeader = request?.headers?.authorization
          if (authHeader && authHeader.split(" ")[0] === "Bearer") {
            console.log("Token trovato nell'header Authorization:", authHeader.split(" ")[1].substring(0, 20) + "...")
            return authHeader.split(" ")[1]
          }

          console.log("Nessun token trovato")
          return null
        },
      ]),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || "your-secret-key",
    })
  }

  async validate(payload: any) {
    console.log("JWT Payload:", payload)

    if (!payload) {
      throw new UnauthorizedException()
    }

    return {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
    }
  }
}

