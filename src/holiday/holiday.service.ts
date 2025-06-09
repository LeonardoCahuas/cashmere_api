import { Injectable, NotFoundException } from "@nestjs/common"
import { PrismaService } from "../prisma/prisma.service"
import type { CreateHolidayDto, UpdateHolidayDto } from "./dto/holiday.dto"
import { HolidayState } from "@prisma/client"

@Injectable()
export class HolidayService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, data: CreateHolidayDto) {

    console.log(data)
    return this.prisma.holiday.create({
      data: {
        start: data.start,
        end:data.end,
        reason:data.reason,
        type:data.type,
        user: { connect: { id: userId } },
        state: data.state ? data.state : "CONFERMARE"
      },
    })
  }

  async findAll() {
    return this.prisma.holiday.findMany({
      include: {
        user: true,
      },
    })
  }

  async findUserHoliday(userId: string) {
    return this.prisma.holiday.findMany({
      where: {
        userId:userId
      },
      include: {
        user: true,
      },
    })
  }

  async findOne(id: string) {
    const holiday = await this.prisma.holiday.findUnique({
      where: { id },
      include: {
        user: true,
      },
    })

    if (!holiday) {
      throw new NotFoundException("Holiday not found")
    }

    return holiday
  }

  async update(id: string, data: UpdateHolidayDto) {
    const holiday = await this.findOne(id)

    return this.prisma.holiday.update({
      where: { id },
      data,
      include: {
        user: true,
      },
    })
  }

  async remove(id: string) {
    const holiday = await this.findOne(id)

    return this.prisma.holiday.delete({
      where: { id },
    })
  }
}