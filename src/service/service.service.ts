import { Injectable, NotFoundException } from "@nestjs/common"
import type { PrismaService } from "../prisma/prisma.service"
import type { CreateServiceDto, UpdateServiceDto } from "./dto/service.dto"

@Injectable()
export class ServiceService {
  constructor(private prisma: PrismaService) {}

  async create(data: CreateServiceDto) {
    return this.prisma.service.create({
      data,
    })
  }

  async findAll() {
    return this.prisma.service.findMany()
  }

  async findOne(id: string) {
    const service = await this.prisma.service.findUnique({
      where: { id },
    })

    if (!service) {
      throw new NotFoundException("Service not found")
    }

    return service
  }

  async update(id: string, data: UpdateServiceDto) {
    const service = await this.prisma.service.findUnique({
      where: { id },
    })

    if (!service) {
      throw new NotFoundException("Service not found")
    }

    return this.prisma.service.update({
      where: { id },
      data,
    })
  }

  async remove(id: string) {
    const service = await this.prisma.service.findUnique({
      where: { id },
    })

    if (!service) {
      throw new NotFoundException("Service not found")
    }

    return this.prisma.service.delete({
      where: { id },
    })
  }

  async getServiceStats(startDate: Date, endDate: Date) {
    const bookings = await this.prisma.booking.findMany({
      where: {
        start: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        services: true,
      },
    })

    const serviceStats = new Map()

    bookings.forEach((booking) => {
      booking.services.forEach((service) => {
        if (!serviceStats.has(service.id)) {
          serviceStats.set(service.id, {
            id: service.id,
            name: service.name,
            count: 0,
            totalRevenue: 0,
          })
        }

        const stats = serviceStats.get(service.id)
        stats.count++
        stats.totalRevenue += service.price
      })
    })

    return Array.from(serviceStats.values())
  }
}

