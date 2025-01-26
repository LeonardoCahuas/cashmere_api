import { Injectable } from "@nestjs/common"
import { PrismaService } from "../prisma/prisma.service"
import type { CreateLogDto } from "./dto/log.dto"

@Injectable()
export class LogService {
  constructor(private prisma: PrismaService) {}

  async create(data: CreateLogDto) {
    return this.prisma.log.create({
      data,
      include: {
        user: true,
        booking: true,
      },
    })
  }

  async findAll() {
    return this.prisma.log.findMany({
      include: {
        user: true,
        booking: true,
      },
      orderBy: {
        time: "desc",
      },
    })
  }

  async findByBooking(bookingId: string) {
    return this.prisma.log.findMany({
      where: { bookingId },
      include: {
        user: true,
        booking: true,
      },
      orderBy: {
        time: "desc",
      },
    })
  }

  async findByUser(userId: string) {
    return this.prisma.log.findMany({
      where: { userId },
      include: {
        user: true,
        booking: true,
      },
      orderBy: {
        time: "desc",
      },
    })
  }
}