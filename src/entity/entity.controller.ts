import { Controller, Get, Post, Body, Put, Param, Delete, UseGuards, Query, Req } from "@nestjs/common"
import { EntityService } from "./entity.service"
import type { CreateEntityDto, UpdateEntityDto } from "./dto/entity.dto"
import { JwtAuthGuard } from "../auth/jwt-auth.guards"
import { RolesGuard } from "../auth/roles.guards"
import { Roles } from "../auth/roles.decorator"
import { Role } from "@prisma/client"
import { User } from "../auth/user.decorator"

@Controller("entities")
@UseGuards(JwtAuthGuard, RolesGuard)
export class EntityController {
  constructor(private readonly entityService: EntityService) {}

  @Post()
  //@Roles(Role.ADMIN)
  create(@Body() createEntityDto: CreateEntityDto, @Req() req: Request,@User() user?: any) {
    console.log(createEntityDto)
    console.log(req.body)
    // @ts-ignore
    return this.entityService.create(req.body);
  }

  @Get()
  //@Roles(Role.ADMIN, Role.SECRETARY)
  findAll() {
    return this.entityService.findAll()
  }

  @Get(':id')
  //@Roles(Role.ADMIN, Role.SECRETARY)
  findOne(@Param('id') id: string) {
    return this.entityService.findOne(id);
  }

  @Put(":id")
  //@Roles(Role.ADMIN)
  update(@Param('id') id: string, @Body() updateEntityDto: UpdateEntityDto) {
    return this.entityService.update(id, updateEntityDto)
  }

  @Delete(':id')
  //@Roles(Role.ADMIN)
  remove(@Param('id') id: string) {
    return this.entityService.remove(id);
  }

  @Get(":id/bookings")
  //@Roles(Role.ADMIN, Role.SECRETARY)
  getBookings(@Param('id') id: string, @Query() query: any) {
    return this.entityService.getBookings(id, query)
  }

  @Get(":id/invoices")
  //@Roles(Role.ADMIN)
  getInvoices(@Param('id') id: string, @Query() query: any) {
    return this.entityService.getInvoices(id, query)
  }
}