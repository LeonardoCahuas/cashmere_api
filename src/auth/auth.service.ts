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
    try {
      // Let's log the entire DTO first
      console.log("Received DTO:", JSON.stringify(dto, null, 2));
  
      // Check if username exists and log its value
      console.log("Username value:", dto?.username);
  
      if (!dto.username) {
        console.log("Username check failed - throwing UnauthorizedException");
        throw new UnauthorizedException("Username is required");
      }
  
      console.log("ciao - passed username check");
  
      // Rest of your code...
      const user = await this.prisma.user.findUnique({
        where: {
          username: dto.username,
        },
      });
  
      console.log("Found user:", user ? "yes" : "no");
  
      if (!user) {
        throw new UnauthorizedException("Invalid credentials");
      }
  
      const isPasswordValid = await bcrypt.compare(dto.password, user.password);
      console.log("Password valid:", isPasswordValid);
  
      if (!isPasswordValid) {
        throw new UnauthorizedException("Invalid credentials");
      }
  
      const token = this.jwtService.sign({
        sub: user.id,
        username: user.username,
        role: user.role,
      });
  
      return {
        token,
        user: {
          id: user.id,
          username: user.username,
          role: user.role,
        },
      };
    } catch (error) {
      console.error("Login error:", error);
      throw error;
    }
  }
}

