import { Injectable, UnauthorizedException } from "@nestjs/common"
import { JwtService } from "@nestjs/jwt"
import { PrismaService } from "../prisma/prisma.service"
import * as bcrypt from "bcrypt"
import type { RegisterDto, LoginDto } from "./dto/auth.dto"

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const hashedPassword = await bcrypt.hash(dto.password, 10)

    const user = await this.prisma.user.create({
      data: {
        username: dto.username,
        password: hashedPassword,
        phone: dto.phone,
        role: "USER", // Default role
      },
    })

    const token = this.jwtService.sign({
      sub: user.id,
      username: user.username,
      role: user.role,
    })

    return {
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
      },
    }
  }

  async login(dto: LoginDto) {
    if (!dto.username) {
      throw new UnauthorizedException("Username is required")
    }

    const user = await this.prisma.user.findUnique({
      where: {
        username: dto.username,
      },
    })

    if (!user) {
      throw new UnauthorizedException("Invalid credentials")
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.password)

    if (!isPasswordValid) {
      throw new UnauthorizedException("Invalid credentials")
    }

    const token = this.jwtService.sign({
      sub: user.id,
      username: user.username,
      role: user.role,
    })

    return {
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
      },
    }
  }
}

