import { Controller, Get, Post, Body, Param, UseGuards } from "@nestjs/common"
import { LogService } from "./log.service"
import { JwtAuthGuard } from "../auth/jwt-auth.guards"
import { RolesGuard } from "../auth/roles.guards"
import { Roles } from "../auth/roles.decorator"
import { Role } from "@prisma/client"
import type { CreateLogDto } from "./dto/log.dto"

@Controller("logs")
//@UseGuards(JwtAuthGuard, RolesGuard)
export class LogController {
  constructor(private logService: LogService) {}

  @Post()
  //@Roles(Role.ADMIN)
  create(@Body() dto: CreateLogDto) {
    return this.logService.create(dto)
  }

  @Get()
  //@Roles(Role.ADMIN)
  findAll() {
    return this.logService.findAll()
  }

  @Get("booking/:bookingId")
  //@Roles(Role.ADMIN)
  findByBooking(@Param("bookingId") bookingId: string) {
    return this.logService.findByBooking(bookingId)
  }

  @Get("user/:userId")
  //@Roles(Role.ADMIN)
  findByUser(@Param("userId") userId: string) {
    return this.logService.findByUser(userId)
  }
}