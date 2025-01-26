import { Injectable, NotFoundException } from "@nestjs/common"
import { PrismaService } from "../prisma/prisma.service"
import type { CreateEntityDto, UpdateEntityDto } from "./dto/entity.dto"
import { BookingFilters } from "../utils/booking-filter.util"

@Injectable()
export class EntityService {
  constructor(private prisma: PrismaService) {}

  async create(data: CreateEntityDto) {
    return this.prisma.entity.create({
      data: {
        name: data.name,
        users: {
          connect: data.userIds?.map((id) => ({ id })),
        },
      },
      include: {
        users: true,
      },
    })
  }

  async findAll() {
    return this.prisma.entity.findMany({
      include: {
        users: true,
      },
    })
  }

  async findOne(id: string) {
    const entity = await this.prisma.entity.findUnique({
      where: { id },
      include: {
        users: true,
      },
    })

    if (!entity) {
      throw new NotFoundException("Entity not found")
    }

    return entity
  }

  async update(id: string, data: UpdateEntityDto) {
    const entity = await this.prisma.entity.findUnique({
      where: { id },
    })

    if (!entity) {
      throw new NotFoundException("Entity not found")
    }

    return this.prisma.entity.update({
      where: { id },
      data: {
        name: data.name,
        users: {
          set: data.userIds?.map((id) => ({ id })),
        },
      },
      include: {
        users: true,
      },
    })
  }

  async remove(id: string) {
    const entity = await this.prisma.entity.findUnique({
      where: { id },
    })

    if (!entity) {
      throw new NotFoundException("Entity not found")
    }

    return this.prisma.entity.delete({
      where: { id },
    })
  }

  async getBookings(id: string, query: any) {
    const entity = await this.prisma.entity.findUnique({
      where: { id },
    })

    if (!entity) {
      throw new NotFoundException("Entity not found")
    }

    const filters = BookingFilters.createBookingFilters({
      ...query,
      entityId: id,
    })

    return this.prisma.booking.findMany({
      where: filters,
      include: {
        user: true,
        fonico: true,
        studio: true,
        services: true,
      },
    })
  }

  async getInvoices(id: string, query: any) {
    // Implementa la logica per recuperare le fatture dell'entità
    const entity = await this.prisma.entity.findUnique({
      where: { id },
    })

    if (!entity) {
      throw new NotFoundException("Entity not found")
    }

    const bookings = await this.prisma.booking.findMany({
      where: {
        user: {
          entityId: id,
        },
        start: {
          gte: query.startDate ? new Date(query.startDate) : undefined,
          lte: query.endDate ? new Date(query.endDate) : undefined,
        },
      },
      include: {
        services: true,
        studio: true,
      },
    })

    // Calcola il totale per ogni prenotazione
    return bookings.map((booking) => ({
      bookingId: booking.id,
      date: booking.start,
      studioPrice: booking.studio.price,
      servicesPrice: booking.services.reduce((acc, service) => acc + service.price, 0),
      total: booking.studio.price + booking.services.reduce((acc, service) => acc + service.price, 0),
    }))
  }
}

