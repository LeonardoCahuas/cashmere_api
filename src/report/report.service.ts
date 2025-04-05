import { Injectable, NotFoundException } from "@nestjs/common"
import { PrismaService } from "../prisma/prisma.service"
import type { CreateReportDto } from "./dto/report.dto"

@Injectable()
export class ReportService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, data: CreateReportDto) {

    console.log(data)
    return this.prisma.report.create({
      data: {
        reason:data.reason,
        user: { connect: { id: userId } },
      },
    })
  }

  async findAll() {
    return this.prisma.report.findMany({
      include: {
        user: true,
      },
    })
  }

  async findOne(id: string) {
    const report = await this.prisma.report.findUnique({
      where: { id },
      include: {
        user: true,
      },
    })

    if (!report) {
      throw new NotFoundException("Holiday not found")
    }

    return report
  }

  /* async update(id: string, data: UpdateHolidayDto) {
    const report = await this.findOne(id)

    return this.prisma.report.update({
      where: { id },
      data,
      include: {
        user: true,
      },
    })
  } */

  async remove(id: string) {
    const report = await this.findOne(id)

    return this.prisma.report.delete({
      where: { id },
    })
  }
}