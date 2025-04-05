import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseEnumPipe,
  Req
} from "@nestjs/common"
import { ParseDatePipe } from "../common/pipes/parse-date.pipe"
import { BookingService } from "./booking.service"
import { JwtAuthGuard } from "../auth/jwt-auth.guards"
import { RolesGuard } from "../auth/roles.guards"
import { Roles } from "../auth/roles.decorator"
import { User } from "../auth/user.decorator"
import { BookingState, Role } from "@prisma/client"
import {
  CreateBookingDto,
  UpdateBookingDto,
  UpdateBookingStateDto
} from "./dto/booking.dto"
import { Request } from "express";
import { StateType } from '../../utils/types'

interface EngineerAvailability {
  id: string
  username: string
  isAvailable: boolean
  alternativeSlots?: {
    start: string
    end: string
  }[]
}

@Controller("booking")
export class BookingController {
  constructor(private readonly bookingService: BookingService) { }

  @Post()
  async createBooking(
    @Body() dto: CreateBookingDto,
    @User() user: any = 'cm6ry32iu0000xz076yvedk6k'
  ) {
    return this.bookingService.create(dto, dto.userId)
  }

  @Get()
  @Roles(Role.USER, Role.SECRETARY, Role.ADMIN, Role.ENGINEER)
  async getBookings(
    @User() user: any,
    @Query() query: any
  ) {
    return this.bookingService.findAll()
  }

  @Get("confirm")
  @Roles(Role.USER, Role.SECRETARY, Role.ADMIN, Role.ENGINEER)
  async getToConfirm(
    @User() user: any,
    @Query() query: any
  ) {
    return this.bookingService.findToConfirm()
  }

  @Get("current")
  @Roles(Role.USER, Role.SECRETARY, Role.ADMIN, Role.ENGINEER)
  async getCurrentBookings() {
    return this.bookingService.findCurrentBookings()
  }

  @Get("available-studios")
  async getAvailableStudios(@Query("start", ParseDatePipe) start: Date, @Query("end", ParseDatePipe) end: Date): Promise<any> {
    return this.bookingService.findAvailableStudios(start, end)
  }

  @Get("available-slots")
  @Roles(Role.USER, Role.SECRETARY, Role.ADMIN, Role.ENGINEER)
  async getAvailableTimeSlots(@Query("studioId") studioId: string, @Query("fonicoId") fonicoId: string) {
    return this.bookingService.findAvailableTimeSlots(studioId, fonicoId)
  }
  @Get("available-engineers")
  async getAvailableEngineers(@Query("start", ParseDatePipe) start: Date, @Query("end", ParseDatePipe) end: Date): Promise<EngineerAvailability[]> {
    return this.bookingService.findAvailableEngineers(start, end)
  }

  @Get(":id")
  @Roles(Role.USER, Role.SECRETARY, Role.ADMIN, Role.ENGINEER)
  async getBooking(@Param("id") id: string) {
    return this.bookingService.findOne(id)
  }

  @Get("fonico/:id")
  @Roles(Role.USER, Role.SECRETARY, Role.ADMIN, Role.ENGINEER)
  async getFonicoBookings(@Param("id") id: string) {
    return this.bookingService.findEngineerBookings(id)
  }

  @Put(":id")
  async updateBooking(
    @Param("id") id: string,
    @Req() req: Request,
  ) {
    console.log(req)
    //@ts-ignore
    return this.bookingService.update(id, req.body);
  }


  @Put(":id/:state")
  @Roles(Role.SECRETARY, Role.ADMIN)
  async updateBookingState(
    @Param("id") id: string,
    @Param("state", new ParseEnumPipe(BookingState)) state: BookingState
  ) {
    return this.bookingService.update(id, { state: state })
  } 

  @Delete(":id")
  @Roles(Role.SECRETARY, Role.ADMIN)
  async deleteBooking(
    @Param("id") id: string
    //@User() user: any
  ) {
    return this.bookingService.remove(id, 'cm6ds8hq80000w6d2y9ttjh7x')
  }

  /* @Get("stats")
  @Roles(Role.ADMIN)
  async getBookingStats(
    @Query("startDate", ParseDatePipe) startDate: Date,
    @Query("endDate", ParseDatePipe) endDate: Date
  ) {
    return this.bookingService.getBookingStats(startDate, endDate)
  } */

  @Get("entity/:entityId")
  @Roles(Role.ADMIN, Role.SECRETARY)
  async getBookingsByEntity(
    @Param("entityId") entityId: string,
    @Query("startDate", ParseDatePipe) startDate?: Date,
    @Query("endDate", ParseDatePipe) endDate?: Date
  ) {
    return this.bookingService.getBookingsByEntity(entityId, startDate, endDate)
  }

  @Get("fonico/:fonicoId")
  @Roles(Role.ADMIN, Role.SECRETARY, Role.ENGINEER)
  async getBookingsByFonico(
    @Param("fonicoId") fonicoId: string,
    @Query("startDate", ParseDatePipe) startDate?: Date,
    @Query("endDate", ParseDatePipe) endDate?: Date
  ) {
    return this.bookingService.getBookingsByFonico(fonicoId, startDate, endDate)
  }

  @Get("user/:userId")
  @Roles(Role.ADMIN, Role.SECRETARY, Role.ENGINEER)
  async getBookingsByUser(
    @Param("fonicoId") fonicoId: string
  ) {
    return this.bookingService.getBookingsByUser(fonicoId)
  }

  @Get("studio/:studioId")
  @Roles(Role.ADMIN, Role.SECRETARY)
  async getBookingsByStudio(
    @Param("studioId") studioId: string,
    @Query("startDate", ParseDatePipe) startDate?: Date,
    @Query("endDate", ParseDatePipe) endDate?: Date
  ) {
    return this.bookingService.getBookingsByStudio(studioId, startDate, endDate)
  }

  @Get(":id/history")
  @Roles(Role.ADMIN, Role.SECRETARY)
  async getBookingHistory(@Param("id") id: string) {
    return this.bookingService.getBookingHistory(id)
  }
}
