import { Controller, Get, Post, Body, Put, Param, Delete, UseGuards, Query } from "@nestjs/common"
import { ServiceService } from "./service.service"
import type { CreateServiceDto, UpdateServiceDto } from "./dto/service.dto"
import { JwtAuthGuard } from "../auth/jwt-auth.guards"
import { RolesGuard } from "../auth/roles.guards"
import { Roles } from "../auth/roles.decorator"
import { Role } from "@prisma/client"

@Controller("services")
//@UseGuards(JwtAuthGuard, RolesGuard)
export class ServiceController {
  constructor(private readonly serviceService: ServiceService) {}

  @Post()
  //@Roles(Role.ADMIN)
  create(@Body() createServiceDto: CreateServiceDto) {
    return this.serviceService.create(createServiceDto);
  }

  @Get()
  //@Roles(Role.ADMIN, Role.SECRETARY, Role.USER, Role.ENGINEER)
  findAll() {
    return this.serviceService.findAll()
  }

  @Get(':id')
  //@Roles(Role.ADMIN, Role.SECRETARY, Role.USER, Role.ENGINEER)
  findOne(@Param('id') id: string) {
    return this.serviceService.findOne(id);
  }

  @Put(":id")
  //@Roles(Role.ADMIN)
  update(@Param('id') id: string, @Body() updateServiceDto: UpdateServiceDto) {
    return this.serviceService.update(id, updateServiceDto)
  }

  @Delete(':id')
  //@Roles(Role.ADMIN)
  remove(@Param('id') id: string) {
    return this.serviceService.remove(id);
  }

  @Get("stats")
  //@Roles(Role.ADMIN)
  getServiceStats(@Query('startDate') startDate: string, @Query('endDate') endDate: string) {
    return this.serviceService.getServiceStats(new Date(startDate), new Date(endDate))
  }
}

