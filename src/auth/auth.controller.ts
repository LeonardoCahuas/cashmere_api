import { Controller, Post, Body } from "@nestjs/common"
import { AuthService } from "./auth.service";
import type { RegisterDto, LoginDto } from "./dto/auth.dto"

@Controller("auth")
export class AuthController {
  constructor(private authService: AuthService) { }

  @Post('register')
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  async login(@Body() dto: LoginDto) {
    console.log(dto)
    const result = await this.authService.login(dto);
    console.log(result)
    return result;
  }
}