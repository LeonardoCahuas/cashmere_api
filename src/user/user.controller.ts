import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Req } from "@nestjs/common"
import { UserService } from "./user.service"
import { JwtAuthGuard } from "../auth/jwt-auth.guards"
import { RolesGuard } from "../auth/roles.guards"
import { Roles } from "../auth/roles.decorator"
import { Role } from "@prisma/client"
import type { CreateUserDto, UpdateUserDto } from "./dto/user.dto"

@Controller("users")
////@UseGuards(JwtAuthGuard, RolesGuard)
export class UserController {
  constructor(private userService: UserService) {}

  @Post()
  //@Roles(Role.ADMIN)
  create(@Body() dto: CreateUserDto) {
    return this.userService.create(dto)
  }

  @Get()
  //@Roles(Role.ADMIN)
  findAll() {
    return this.userService.findAll()
  }

  @Get("/all")
  //@Roles(Role.ADMIN)
  findAllUsers() {
    return this.userService.findAllUsers()
  }
  @Put("/notes/:id")
  async updateBooking(
    @Param("id") id: string,
    @Req() req: Request,
  ) {
    //@ts-ignore
    return this.userService.updateNotes(id, req.body.notes);
  }

  @Get(":id")
  //@Roles(Role.ADMIN)
  findOne(@Param("id") id: string) {
    return this.userService.findOne(id)
  }

  @Put(":id")
  //@Roles(Role.ADMIN)
  update(@Param("id") id: string, @Body() dto: UpdateUserDto) {
    return this.userService.update(id, dto)
  }

  @Put(":id/:role")
  //@Roles(Role.ADMIN)
  updateRole(@Param("id") id: string, @Param("role") role: Role) {
    return this.userService.updateRole(id, role)
  }

  @Put("/entity/:id/:entity")
  //@Roles(Role.ADMIN)
  updateEntity(@Param("id") id: string, @Param("entity") entity: string) {
    return this.userService.updateEntity(id, entity)
  }

  @Put("/user/:id/:newUsername")
  //@Roles(Role.ADMIN)
  updateUser(@Param("id") id: string, @Param("newUsername") newUsername: string) {
    return this.userService.updateUsername(id, newUsername)
  }

  @Delete(":id")
  //@Roles(Role.ADMIN)
  remove(@Param("id") id: string) {
    return this.userService.remove(id)
  }

  @Get("role/engineer")
  findEngineers() {
    return this.userService.findByRole(Role.ENGINEER)
  }

  @Get("role/user")
  findUsers() {
    return this.userService.findByRole(Role.USER)
  }
}