import { Injectable, ExecutionContext, UnauthorizedException } from "@nestjs/common"
import { AuthGuard } from "@nestjs/passport"

@Injectable()
export class JwtAuthGuard extends AuthGuard("jwt") {
  canActivate(context: ExecutionContext) {
    console.log('JwtAuthGuard - Checking token');
    return super.canActivate(context);
  }

  handleRequest(err: any, user: any, info: any) {
    console.log('JwtAuthGuard - Handle Request:', { err, user, info });
    
    if (err || !user) {
      console.log('JwtAuthGuard - Authentication failed:', { err, info });
      throw err || new UnauthorizedException('Authentication failed');
    }
    
    return user;
  }
}

