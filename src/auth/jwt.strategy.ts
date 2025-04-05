import { ExtractJwt, Strategy } from "passport-jwt"
import { PassportStrategy } from "@nestjs/passport"
import { Injectable, UnauthorizedException } from "@nestjs/common"

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (request: any): string | null => {
          // First try to get token from cookie
          const token = request?.cookies?.token
          if (token) {
            return token
          }
          // Fallback to Authorization header
          const authHeader = request?.headers?.authorization
          if (authHeader && authHeader.split(" ")[0] === "Bearer") {
            return authHeader.split(" ")[1]
          }
          return null
        },
      ]),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || "your-secret-key",
    })
  }

  async validate(payload: any) {
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

