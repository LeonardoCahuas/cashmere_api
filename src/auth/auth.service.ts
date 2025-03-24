import { Injectable, UnauthorizedException } from "@nestjs/common"
import { JwtService } from "@nestjs/jwt"
import { PrismaService } from "../prisma/prisma.service"
import * as bcrypt from "bcrypt"
import type { RegisterDto, LoginDto, GoogleLoginDto } from "./dto/auth.dto"
import { createClient } from "@supabase/supabase-js"
import type { Response } from "express"
import { cookieConfig } from "../common/config/cookie.config"

@Injectable()
export class AuthService {
  private supabase

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {
    this.supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_KEY!)
  }

  private setTokenCookie(res: Response, token: string) {
    res.cookie("token", token, cookieConfig)
  }

  private clearTokenCookie(res: Response) {
    res.clearCookie("token", cookieConfig)
  }

  async register(dto: RegisterDto, res: Response) {
    const hashedPassword = await bcrypt.hash(dto.password, 10)

    const user = await this.prisma.user.create({
      data: {
        username: dto.username,
        password: hashedPassword,
        phone: dto.phone,
        role: "USER",
      },
    })

    const token = this.jwtService.sign({
      sub: user.id,
      username: user.username,
      role: user.role,
    })

    this.setTokenCookie(res, token)

    return {
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
      },
    }
  }

  async login(dto: LoginDto, res: Response) {
    const user = await this.prisma.user.findUnique({
      where: { username: dto.username },
    });
    console.log("eccolo")
    console.log(dto)
    if (!user) {
      throw new UnauthorizedException("Invalid credentials");
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException("Invalid credentials");
    }

    const token = this.jwtService.sign({
      sub: user.id,
      username: user.username,
      role: user.role,
    });

    this.setTokenCookie(res, token);

    return {
      user: {
        id: user.id,
        email: user.username,
        role: user.role,
      }
    }
  }
  async googleLogin(dto: GoogleLoginDto, res: Response) {
    try {
      const {
        data: { user: supabaseUser },
        error,
      } = await this.supabase.auth.getUser(dto.supabaseToken)
      if (error || !supabaseUser || !supabaseUser.email) {
        throw new UnauthorizedException("Invalid Supabase token")
      }

      let user = await this.prisma.user.findUnique({
        where: { username: supabaseUser.email },
      })
      console.log(user)
      if (!user) {
        user = await this.prisma.user.create({
          data: {
            username: supabaseUser.email,
            password: await bcrypt.hash(Math.random().toString(36), 10),
            role: "USER",
          },
        })
      }

      const token = this.jwtService.sign({
        sub: user.id,
        email: user.username,
        role: user.role,
      })

      this.setTokenCookie(res, token)

      return res.status(200).json({
        user: {
          id: user.id,
          username: user.username,
          role: user.role,
        },
      });
    } catch (error) {
      throw new UnauthorizedException("Failed to verify Google login")
    }
  }

  async logout(res: Response) {
    this.clearTokenCookie(res)
    return { message: "Logged out successfully" }
  }
}

