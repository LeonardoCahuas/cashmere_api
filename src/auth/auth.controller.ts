import { Controller, Post, Body, UseInterceptors, Res, UseGuards, HttpCode, HttpStatus, Req } from "@nestjs/common"
import type { Response } from "express"
import { AuthService } from "./auth.service"
import { type RegisterDto, LoginDto, LoginResponseDto, type GoogleLoginDto, GoogleDto } from "./dto/auth.dto"
import { TransformInterceptor } from "../common/interceptors/transform.interceptors"
import { ValidationPipe } from "@nestjs/common"
import { JwtAuthGuard } from "./jwt-auth.guards"
import { daysToWeeks } from "date-fns/esm"

@Controller("auth")
export class AuthController {
  constructor(private authService: AuthService) { }

  @Post("register")
  @UseInterceptors(new TransformInterceptor(LoginResponseDto))
  async register(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    //@ts-ignore
    return this.authService.register(req.body, res);
  }


  @Post("login")
  @HttpCode(HttpStatus.OK)
  async login(@Body() loginData: LoginDto, @Res({ passthrough: true }) res: Response) {
    console.log(loginData)
    return this.authService.login(loginData, res)
  }

  @Post("google")
  @HttpCode(HttpStatus.OK)
  async googleLogin(@Body(new ValidationPipe()) googleLoginData: GoogleDto, @Res({ passthrough: true }) res: Response) {
    return this.authService.googleLogin(googleLoginData, res)
  }

  @Post('logout')
  //@UseGuards(JwtAuthGuard)
  async logout(@Res({ passthrough: true }) res: Response) {
    return this.authService.logout(res);
  }
}

