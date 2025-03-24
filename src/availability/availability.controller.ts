import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from "@nestjs/common"
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

  @Get('fonico')
  @Roles('USER', 'SECRETARY', 'ADMIN', 'ENGINEER')
  async getFonicoAvailability(@Query() query: GetAvailabilityQueryDto) {
    return this.availabilityService.getFonicoAvailability(
      query.fonicoId,
      query.date,
    );
  }

  @Post()
  @Roles("ENGINEER", "ADMIN")
  async createAvailability(@Body() dto: CreateAvailabilityDto, @User() user: any) {
    return this.availabilityService.createAvailability(user.id, dto)
  }

  @Put(":id")
  @Roles("ENGINEER")
  async updateAvailability(@Param('id') id: string, @Body() dto: CreateAvailabilityDto) {
    return this.availabilityService.updateAvailability(id, dto)
  }

  @Delete(':id')
  @Roles('ENGINEER')
  async deleteAvailability(@Param('id') id: string) {
    return this.availabilityService.deleteAvailability(id);
  }
}

