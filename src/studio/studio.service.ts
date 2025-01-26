import { Injectable, NotFoundException } from "@nestjs/common"
import { PrismaService } from "../prisma/prisma.service"
import type { CreateStudioDto, UpdateStudioDto } from "./dto/studio.dto"
import { BookingFilters } from "../utils/booking-filter.util"

@Injectable()
export class StudioService {
  constructor(private prisma: PrismaService) {}

  async create(data: CreateStudioDto) {
    return this.prisma.studio.create({
      data,
    })
  }

  async findAll() {
    return this.prisma.studio.findMany()
  }

  async findOne(id: string) {
    const studio = await this.prisma.studio.findUnique({
      where: { id },
    })

    if (!studio) {
      throw new NotFoundException("Studio not found")
    }

    return studio
  }

  async update(id: string, data: UpdateStudioDto) {
    const studio = await this.prisma.studio.findUnique({
      where: { id },
    })

    if (!studio) {
      throw new NotFoundException("Studio not found")
    }

    return this.prisma.studio.update({
      where: { id },
      data,
    })
  }

  async remove(id: string) {
    const studio = await this.prisma.studio.findUnique({
      where: { id },
    })

    if (!studio) {
      throw new NotFoundException("Studio not found")
    }

    return this.prisma.studio.delete({
      where: { id },
    })
  }

  async checkAvailability(id: string, start: Date, end: Date, fonicoId: string) {
    const studio = await this.prisma.studio.findUnique({
      where: { id },
    })

    if (!studio) {
      throw new NotFoundException("Studio not found")
    }

    return BookingFilters.checkStudioAvailability(id, fonicoId, start, end, this.prisma)
  }
}

