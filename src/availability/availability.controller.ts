import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Req } from "@nestjs/common"
import { AvailabilityService } from "./availability.service"
import { JwtAuthGuard } from "src/auth/jwt-auth.guards"
import { RolesGuard } from "src/auth/roles.guards"
import { Roles } from "../auth/roles.decorator"
import type { CreateAvailabilityDto, GetAvailabilityQueryDto } from "./dto/availability.dto"
import { User } from "src/auth/user.decorator"

@Controller("availability")
@UseGuards(JwtAuthGuard, RolesGuard)
export class AvailabilityController {
  constructor(private availabilityService: AvailabilityService) {}

  @Get('engineer')
  //@Roles('USER', 'SECRETARY', 'ADMIN', 'ENGINEER')
  async getEngineerAvailability(@Req() req: Request, @User() user: any) {
    //@ts-ignore
    console.log(req.query); // Stampa tutta la query string
  
    return this.availabilityService.getEngineerAvailability(
      //@ts-ignore
      req.query.engineerId || user.id, // Default a user.id se manca engineerId
      //@ts-ignore
      req.query.date,
    );
  }

  @Get('weekly')
  //@Roles('USER', 'SECRETARY', 'ADMIN', 'ENGINEER')
  async getWeeklyAvailability(@Query('engineerId') engineerId: string) {
    return this.availabilityService.getWeeklyAvailability(engineerId);
  }

  @Post()
  //@Roles("ENGINEER", "ADMIN")
  async createAvailability(@Body() dto: CreateAvailabilityDto, @User() user: any, @Req() req: Request) {
    console.log(req.body)
    //@ts-ignore
    return this.availabilityService.createAvailability(req.body.engineerId || user.id, req.body)
  }

  @Put(":id")
  //@Roles("ENGINEER", "ADMIN")
  async updateAvailability(@Param('id') id: string, @Body() dto: CreateAvailabilityDto) {
    return this.availabilityService.updateAvailability(id, dto)
  }

  @Delete(':id')
  //@Roles('ENGINEER', 'ADMIN')
  async deleteAvailability(@Param('id') id: string) {
    return this.availabilityService.deleteAvailability(id);
  }
}




