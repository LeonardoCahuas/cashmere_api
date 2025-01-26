import { 
    Controller, 
    Get, 
    Post, 
    Put, 
    Delete, 
    Body, 
    Param, 
    Query, 
    UseGuards
  } from "@nestjs/common"
  import { ParseDatePipe } from "../common/pipes/parse-date.pipe"
  import { BookingService } from "./booking.service"
  import { JwtAuthGuard } from "@/auth/jwt-auth.guards"
  import { RolesGuard } from "@/auth/roles.guards"
  import { Roles } from "../auth/roles.decorator"
  import { User } from "../auth/user.decorator"
  import { Role } from "@prisma/client"
  import { 
    CreateBookingDto, 
    UpdateBookingDto, 
    UpdateBookingStateDto 
  } from "./dto/booking.dto"
  
  @Controller("bookings")
  @UseGuards(JwtAuthGuard, RolesGuard)
  export class BookingController {
    constructor(private readonly bookingService: BookingService) {}
  
    @Post()
    @Roles(Role.USER, Role.SECRETARY, Role.ADMIN)
    async createBooking(
      @Body() dto: CreateBookingDto,
      @User() user: any
    ) {
      return this.bookingService.create(dto, user.id)
    }
  
    @Get()
    @Roles(Role.USER, Role.SECRETARY, Role.ADMIN, Role.ENGINEER)
    async getBookings(
      @User() user: any,
      @Query() query: any
    ) {
      return this.bookingService.findAll(user, query)
    }
  
    @Get(":id")
    @Roles(Role.USER, Role.SECRETARY, Role.ADMIN, Role.ENGINEER)
    async getBooking(@Param("id") id: string) {
      return this.bookingService.findOne(id)
    }
  
    @Put(":id")
    @Roles(Role.SECRETARY, Role.ADMIN)
    async updateBooking(
      @Param("id") id: string,
      @Body() dto: UpdateBookingDto,
      @User() user: any
    ) {
      return this.bookingService.update(id, dto, user.id)
    }
  
    @Put(":id/state")
    @Roles(Role.SECRETARY, Role.ADMIN)
    async updateBookingState(
      @Param("id") id: string,
      @Body() dto: UpdateBookingStateDto,
      @User() user: any
    ) {
      return this.bookingService.update(id, { state: dto.state }, user.id)
    }
  
    @Delete(":id")
    @Roles(Role.SECRETARY, Role.ADMIN)
    async deleteBooking(
      @Param("id") id: string,
      @User() user: any
    ) {
      return this.bookingService.remove(id, user.id)
    }
  
    @Get("stats")
    @Roles(Role.ADMIN)
    async getBookingStats(
      @Query("startDate", ParseDatePipe) startDate: Date,
      @Query("endDate", ParseDatePipe) endDate: Date
    ) {
      return this.bookingService.getBookingStats(startDate, endDate)
    }
  
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
  