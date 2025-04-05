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
    // Cerca prima un'entità con l'ID fornito
    let entity = await this.prisma.entity.findUnique({
      where: { id },
    });
  
    let user;
  
    if (!entity) {
      // Se non trova un'entità, cerca un utente con quell'ID
      user = await this.prisma.user.findUnique({
        where: { id },
      });
  
      if (!user) {
        throw new NotFoundException("Entity or User not found");
      }
    }
  
    // Recupera le prenotazioni in base all'ID dell'entità o dell'utente
    const bookings = await this.prisma.booking.findMany({
      where: {
        user: {
          entityId: entity ? id : undefined,
          id: user ? id : undefined,
        },
        start: {
          gte: query.startDate ? new Date(query.startDate) : undefined,
          lte: query.endDate ? new Date(query.endDate) : undefined,
        },
      },
      include: {
        services: true,
        studio: true,
        fonico: true, // Include il fonico per ottenere il nome
      },
    });
  
    // Raggruppa le ore di prenotazione per fonicoId
    const fonicoSessions = new Map();
    let totHoursWithoutFonico = 0;
  
    bookings.forEach((booking) => {
      const bookingHours = (new Date(booking.end).getTime() - new Date(booking.start).getTime()) / 3600000;
      
      if (booking.fonico) {
        const fonicoName = booking.fonico.username;
        if (!fonicoSessions.has(fonicoName)) {
          fonicoSessions.set(fonicoName, { fonicoName, totHours: 0 });
        }
        fonicoSessions.get(fonicoName).totHours += bookingHours;
      } else {
        totHoursWithoutFonico += bookingHours;
      }
    });
  
    // Converti l'oggetto in un array e aggiungi eventuali sessioni senza fonico
    const result = Array.from(fonicoSessions.values());
    if (totHoursWithoutFonico > 0) {
      result.push({ fonicoName: "Senza Fonico", totHours: totHoursWithoutFonico });
    }
  
    return result;
  }
}

