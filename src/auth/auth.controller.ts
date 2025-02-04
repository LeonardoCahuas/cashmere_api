import { Controller, Post, Body, UseInterceptors, Res, UseGuards } from "@nestjs/common"
import type { Response } from "express"
import { AuthService } from "./auth.service"
import { type RegisterDto, type LoginDto, LoginResponseDto, type GoogleLoginDto } from "./dto/auth.dto"
import { TransformInterceptor } from "@/common/interceptors/transform.interceptors"
import { ValidationPipe } from "@nestjs/common"
import { JwtAuthGuard } from "./jwt-auth.guards"

@Controller("auth")
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post("register")
  @UseInterceptors(new TransformInterceptor(LoginResponseDto))
  async register(@Body(new ValidationPipe()) dto: RegisterDto, @Res({ passthrough: true }) res: Response) {
    return this.authService.register(dto, res)
  }

  @Post("login")
  @UseInterceptors(new TransformInterceptor(LoginResponseDto))
  async login(@Body(new ValidationPipe()) dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    return this.authService.login(dto, res)
  }

  @Post("google")
  @UseInterceptors(new TransformInterceptor(LoginResponseDto))
  async googleLogin(@Body(new ValidationPipe()) dto: GoogleLoginDto, @Res({ passthrough: true }) res: Response) {
    return this.authService.googleLogin(dto, res)
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  async logout(@Res({ passthrough: true }) res: Response) {
    return this.authService.logout(res);
  }
}

