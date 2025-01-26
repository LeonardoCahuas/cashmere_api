import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from "@nestjs/common"
import { UserService } from "./user.service"
import { JwtAuthGuard } from "../auth/jwt-auth.guards"
import { RolesGuard } from "../auth/roles.guards"
import { Roles } from "../auth/roles.decorator"
import { Role } from "@prisma/client"
import type { CreateUserDto, UpdateUserDto } from "./dto/user.dto"

@Controller("users")
@UseGuards(JwtAuthGuard, RolesGuard)
export class UserController {
  constructor(private userService: UserService) {}

  @Post()
  @Roles(Role.ADMIN)
  create(@Body() dto: CreateUserDto) {
    return this.userService.create(dto)
  }

  @Get()
  @Roles(Role.ADMIN)
  findAll() {
    return this.userService.findAll()
  }

  @Get(":id")
  @Roles(Role.ADMIN)
  findOne(@Param("id") id: string) {
    return this.userService.findOne(id)
  }

  @Put(":id")
  @Roles(Role.ADMIN)
  update(@Param("id") id: string, @Body() dto: UpdateUserDto) {
    return this.userService.update(id, dto)
  }

  @Delete(":id")
  @Roles(Role.ADMIN)
  remove(@Param("id") id: string) {
    return this.userService.remove(id)
  }
}