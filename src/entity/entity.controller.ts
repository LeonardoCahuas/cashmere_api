import { Controller, Get, Post, Body, Put, Param, Delete, UseGuards, Query } from "@nestjs/common"
import { EntityService } from "./entity.service"
import type { CreateEntityDto, UpdateEntityDto } from "./dto/entity.dto"
import { JwtAuthGuard } from "@/auth/jwt-auth.guards"
import { RolesGuard } from "@/auth/roles.guards"
import { Roles } from "../auth/roles.decorator"
import { Role } from "@prisma/client"

@Controller("entities")
@UseGuards(JwtAuthGuard, RolesGuard)
export class EntityController {
  constructor(private readonly entityService: EntityService) {}

  @Post()
  @Roles(Role.ADMIN)
  create(@Body() createEntityDto: CreateEntityDto) {
    return this.entityService.create(createEntityDto);
  }

  @Get()
  @Roles(Role.ADMIN, Role.SECRETARY)
  findAll() {
    return this.entityService.findAll()
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.SECRETARY)
  findOne(@Param('id') id: string) {
    return this.entityService.findOne(id);
  }

  @Put(":id")
  @Roles(Role.ADMIN)
  update(@Param('id') id: string, @Body() updateEntityDto: UpdateEntityDto) {
    return this.entityService.update(id, updateEntityDto)
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  remove(@Param('id') id: string) {
    return this.entityService.remove(id);
  }

  @Get(":id/bookings")
  @Roles(Role.ADMIN, Role.SECRETARY)
  getBookings(@Param('id') id: string, @Query() query: any) {
    return this.entityService.getBookings(id, query)
  }

  @Get(":id/invoices")
  @Roles(Role.ADMIN)
  getInvoices(@Param('id') id: string, @Query() query: any) {
    return this.entityService.getInvoices(id, query)
  }
}

