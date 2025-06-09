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
    // Imposta il cookie con opzioni sicure
    res.cookie("token", token, {
      ...cookieConfig,
      httpOnly: true, // Il cookie non è accessibile via JavaScript
      secure: process.env.NODE_ENV === "production", // HTTPS solo in produzione
      sameSite: "lax", // Protegge contro CSRF
      maxAge: 24 * 60 * 60 * 1000, // 24 ore
    })

    console.log("Token cookie impostato:", token.substring(0, 20) + "...")
  }

  private clearTokenCookie(res: Response) {
    res.clearCookie("token", cookieConfig)
  }

  async register(dto: RegisterDto, res: Response) {
    // 1. Registra l’utente su Supabase
    const { data, error } = await this.supabase.auth.signUp({
      email: dto.username, // se username è l'email
      password: dto.password,
    })

    if (error) {
      throw new UnauthorizedException(error.message)
    }

    // 2. NON creare subito l’utente su Prisma finché non è confermato
    // Puoi eventualmente salvarlo in "pending" se vuoi

    return {
      message: "Check your email to confirm your address",
      user: data.user,
    }
  }


  async login(dto: LoginDto, res: Response) {
    console.log("🔐 Login attempt:", dto.username)
  
    // 1. Autenticazione via Supabase
    const { data, error } = await this.supabase.auth.signInWithPassword({
      email: dto.username,
      password: dto.password,
    })
  
    if (error || !data.user) {
      console.warn("❌ Supabase login failed:", error?.message)
      throw new UnauthorizedException("Invalid credentials")
    }
  
    const supabaseUser = data.user
    const email = supabaseUser.email
    if (!email) {
      console.error("❌ Supabase user has no email!")
      throw new UnauthorizedException("Email not available from Supabase")
    }
  
    console.log("✅ Supabase login successful:", email)
  
    // 2. Cerca nella tabella `user` (Prisma)
    let user = await this.prisma.user.findUnique({
      where: { auth_id: email },
    })
  
    if (user) {
      console.log("🗃️ User found in Prisma:", user.id)
    } else {
      console.log("🆕 No user found, creating new user in Prisma...")
      user = await this.prisma.user.create({
        data: {
          auth_id: email,
          username: email,
          password: await bcrypt.hash(Math.random().toString(36), 10), // dummy password
          role: "USER",
        },
      })
      console.log("✅ New user created with ID:", user.id)
    }
  
    // 3. Genera JWT
    const token = this.jwtService.sign({
      sub: user.id,
      username: user.username,
      role: user.role,
      //@ts-ignore
      isSuperAdmin: user.isSuperAdmin,
    })
  
    console.log("🔑 JWT token generated")
  
    // 4. Imposta il cookie
    this.setTokenCookie(res, token)
  
    console.log("🍪 Token cookie set for user:", user.username)
  
    return {
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        //@ts-ignore
        isSuperAdmin: user.isSuperAdmin,
      },
      token,
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
        where: { auth_id: supabaseUser.email },
      })
      console.log("Google login user:", user)

      if (!user) {
        user = await this.prisma.user.create({
          data: {
            auth_id: supabaseUser.email,
            username: supabaseUser.email,
            password: await bcrypt.hash(Math.random().toString(36), 10),
            role: "USER",
          },
        })
      }

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
          //@ts-ignore
          isSuperAdmin: user.isSuperAdmin
        },
        token: token, // Includi il token nella risposta per il frontend
      }
    } catch (error) {
      console.error("Google login error:", error)
      throw new UnauthorizedException("Failed to verify Google login")
    }
  }

  async logout(res: Response) {
    this.clearTokenCookie(res)
    return { message: "Logged out successfully" }
  }
}

