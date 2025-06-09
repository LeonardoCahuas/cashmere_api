import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Req, Query } from "@nestjs/common"
import { UserService } from "./user.service"
import { JwtAuthGuard } from "../auth/jwt-auth.guards"
import { RolesGuard } from "../auth/roles.guards"
import { Roles } from "../auth/roles.decorator"
import { Role } from "@prisma/client"
import type { CreateUserDto, RegisterDto, UpdateUserDto } from "./dto/user.dto"

@Controller("users")
////@UseGuards(JwtAuthGuard, RolesGuard)
export class UserController {
  constructor(private userService: UserService) { }

  @Post()
  //@Roles(Role.ADMIN)
  create(@Req() req: Request,) {
    //@ts-ignore
    return this.userService.create(req.body)
  }

  @Get()
  //@Roles(Role.ADMIN)
  findAll() {
    return this.userService.findAll()
  }

  @Get("/all")
  findAllUsers(@Query("id") id: string) { // Change @Param to @Query
    console.log(id);
    return this.userService.findAllUsers(id);
  }

  @Get("/managers")
  //@Roles(Role.ADMIN)
  findManagers() {
    return this.userService.findAllManagers()
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

  @Get("/managers-users/:id")
  //@Roles(Role.ADMIN)
  findManagersUser(@Param("id") id: string) {
    return this.userService.findManagers(id)
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

  // 1. Assegna un manager a un utente (aggiunta singola)
  @Post("/assign-manager/:userId/:managerId")
  assignManagerToUser(
    @Param("userId") userId: string,
    @Param("managerId") managerId: string,
  ) {
    return this.userService.assignManagerToUser(userId, managerId);
  }

  // 2. Sostituisce tutti i manager di un utente con una nuova lista
  @Put("/update-managers/:userId")
  updateUserManagers(
    @Param("userId") userId: string,
    @Body() body: { managerIds: string[] },
  ) {
    return this.userService.updateUserManagers(userId, body.managerIds);
  }

  // 3. Rimuove un manager specifico da un utente
  @Delete("/remove-manager/:userId/:managerId")
  removeManagerFromUser(
    @Param("userId") userId: string,
    @Param("managerId") managerId: string,
  ) {
    return this.userService.removeManagerFromUser(userId, managerId);
  }

  @Get("/user-managers/:id")
  //@Roles(Role.ADMIN)
  findUserManagers(@Param("id") id: string) {
    return this.userService.getUserManagers(id)
  }
}