import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Query } from "@nestjs/common"
import { HolidayService } from "./holiday.service"
import { JwtAuthGuard } from "../auth/jwt-auth.guards"
import { RolesGuard } from "../auth/roles.guards"
import { Roles } from "../auth/roles.decorator"
import { User } from "../auth/user.decorator"
import { Role } from "@prisma/client"
import type { CreateHolidayDto, UpdateHolidayDto } from "./dto/holiday.dto"

@Controller("holidays")
@UseGuards(JwtAuthGuard, RolesGuard)
export class HolidayController {
  constructor(private holidayService: HolidayService) {}

  @Post()
  @Roles(Role.ENGINEER)
  create(@Body() dto: CreateHolidayDto, @User() user: any) {
    return this.holidayService.create(user.id, dto)
  }

  @Get()
  @Roles(Role.ADMIN, Role.SECRETARY)
  findAll(@Query("userId") userId?: string) {
    return this.holidayService.findAll(userId)
  }

  @Get(":id")
  @Roles(Role.ADMIN, Role.SECRETARY, Role.ENGINEER)
  findOne(@Param("id") id: string) {
    return this.holidayService.findOne(id)
  }

  @Put(":id")
  @Roles(Role.ENGINEER)
  update(@Param("id") id: string, @Body() dto: UpdateHolidayDto) {
    return this.holidayService.update(id, dto)
  }

  @Delete(":id")
  @Roles(Role.ENGINEER)
  remove(@Param("id") id: string) {
    return this.holidayService.remove(id)
  }
}