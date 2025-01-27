import { ExtractJwt, Strategy } from "passport-jwt"
import { PassportStrategy } from "@nestjs/passport"
import { Injectable, UnauthorizedException } from "@nestjs/common"
import { ConfigService } from "@nestjs/config"

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private configService: ConfigService) {
    const secret = configService.get<string>("JWT_SECRET");
    console.log('JwtStrategy - Using secret:', secret); // Debug log
    
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  async validate(payload: any) {
    console.log('JwtStrategy - Validating payload:', payload);
    
    if (!payload) {
      throw new UnauthorizedException('Invalid token payload');
    }

    const user = {
      id: payload.sub,
      username: payload.username,
      role: payload.role,
    };

    console.log('JwtStrategy - Validated user:', user);
    return user;
  }
}

