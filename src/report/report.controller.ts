import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Query, Req, ParseEnumPipe } from "@nestjs/common"
import { ReportService } from "./report.service"
import { JwtAuthGuard } from "../auth/jwt-auth.guards"
import { RolesGuard } from "../auth/roles.guards"
import { Roles } from "../auth/roles.decorator"
import { User } from "../auth/user.decorator"
import { Role } from "@prisma/client"
import { CreateReportDto } from "./dto/report.dto"

@Controller("report")
export class ReportController {
  constructor(private reportService: ReportService) { }

  @Post()
  async createReport(
    @Req() req: Request
  ) {
    console.log(req.body)
    // @ts-ignore
    return this.reportService.create(req.body.userId, req.body)
  }

  @Get()
  //@Roles(Role.ADMIN, Role.SECRETARY)
  findAll() {
    return this.reportService.findAll()
  }

  @Get(":id")
  //@Roles(Role.ADMIN, Role.SECRETARY, Role.ENGINEER)
  findOne(@Param("id") id: string) {
    return this.reportService.findOne(id)
  }

  /* @Put(":id")
  //@Roles(Role.ENGINEER)
  update(@Param("id") id: string, @Body() dto: UpdateReportDto) {
    return this.reportService.update(id, dto)
  } */

  @Delete(":id")
  //@Roles(Role.ENGINEER)
  remove(@Param("id") id: string) {
    return this.reportService.remove(id)
  }

}


