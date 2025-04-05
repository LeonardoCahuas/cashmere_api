import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Query, Req, ParseEnumPipe } from "@nestjs/common"
import { HolidayService } from "./holiday.service"
import { JwtAuthGuard } from "../auth/jwt-auth.guards"
import { RolesGuard } from "../auth/roles.guards"
import { Roles } from "../auth/roles.decorator"
import { User } from "../auth/user.decorator"
import { HolidayState, Role } from "@prisma/client"
import type { CreateHolidayDto, UpdateHolidayDto } from "./dto/holiday.dto"

@Controller("holiday")
export class HolidayController {
  constructor(private holidayService: HolidayService) { }

  @Post()
  async createHoliday(
    @Body() dto: CreateHolidayDto,
    @Req() req: Request
  ) {
    console.log(req.body)
    console.log("DTO ricevuto:", dto);
    // @ts-ignore
    return this.holidayService.create(req.body.userId, req.body)
  }

  @Get()
  @Roles(Role.ADMIN, Role.SECRETARY)
  findAll() {
    return this.holidayService.findAll()
  }

  @Get("/user/:userId")
  @Roles(Role.ADMIN, Role.SECRETARY)
  findUserHoliday(@Param("userId") userId: string) {
    return this.holidayService.findUserHoliday(userId)
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

  @Put(":id/:state")
  @Roles(Role.SECRETARY, Role.ADMIN)
  async updateBookingState(
    @Param("id") id: string,
    @Param("state", new ParseEnumPipe(HolidayState)) state: HolidayState
  ) {
    return this.holidayService.update(id, { state: state })
  } 
}


