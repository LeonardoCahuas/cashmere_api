import { Module } from "@nestjs/common"
import { JwtModule } from "@nestjs/jwt"
import { PassportModule } from "@nestjs/passport"
import { AuthService } from "./auth.service"
import { AuthController } from "./auth.controller"
import { JwtStrategy } from "./jwt.strategy"
import { PrismaService } from "../prisma/prisma.service"
import { ConfigModule, ConfigService } from "@nestjs/config"
import { RolesGuard } from "./roles.guards"
import { Reflector } from "@nestjs/core"

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: "jwt" }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>("JWT_SECRET"),
        signOptions: { expiresIn: "1d" },
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [AuthService, JwtStrategy, PrismaService, RolesGuard, Reflector],
  controllers: [AuthController],
  exports: [AuthService, JwtStrategy, PassportModule, RolesGuard, Reflector],
})
export class AuthModule {}

