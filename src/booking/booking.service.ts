import { Injectable, BadRequestException, NotFoundException } from "@nestjs/common"
import { PrismaService } from "../prisma/prisma.service"
import type { CreateBookingDto, UpdateBookingDto, BookingStatsResponse, BookingFilters } from "./dto/booking.dto"
import { BookingFilters as BookingFilterUtil } from "../utils/booking-filter.util"
import { type Booking, Role, type User, type Log, BookingState } from "@prisma/client"
import { StateType } from "utils/types"

type BookingWithRelations = Booking & {
  services: Array<{ id: string; price: number }>
  studio: { price: number }
  fonico: { username: string }
  user: User
}

@Injectable()
export class BookingService {
  constructor(private prisma: PrismaService) {}

  async create(data: CreateBookingDto, userId: string): Promise<BookingWithRelations> {
    const isAvailable = await BookingFilterUtil.checkStudioAvailability(
      data.studioId,
      data.fonicoId,
      data.start,
      data.end,
      this.prisma,
    )

    /* if (!isAvailable) {
      throw new BadRequestException("Time slot not available")
    } */

      console.log(data)
      console.log(userId)

      return this.prisma.booking.create({
        data: {
          start: data.start,
          end: data.end,
          state: data.state,
          notes: data.notes ?? null,
          studio: { connect: { id: data.studioId } },
          services: {
            connect: data.services?.map((id) => ({ id })) ?? [],
          },
          user: { connect: { id: 'cm6ry32iu0000xz076yvedk6k' } },
          fonico: { connect: { id: 'cm6ds8hq80000w6d2y9ttjh7x' } },
          booked_by: userId ? { connect: { id: userId } } : undefined as any,
        },
        include: {
          services: true,
          studio: true,
          fonico: true,
          user: true,
        },
      });  
  }

  async findAll(): Promise<BookingWithRelations[]> {
    //const filters: BookingFilters = BookingFilterUtil.createBookingFilters(query)

    /* switch (user.role) {
      case Role.USER:
        filters.userId = user.id
        break
      case Role.ENGINEER:
        filters.fonicoId = user.id
        break
      case Role.SECRETARY:
      case Role.ADMIN:
        break
    } */

    return this.prisma.booking.findMany({
      where: {
        state: BookingState.CONTATTARE
      },
      include: {
        services: true,
        studio: true,
        fonico: true,
        user: true,
      },
      orderBy: {
        start: "asc",
      },
    })
  }

  async findOne(id: string): Promise<BookingWithRelations> {
    const booking = await this.prisma.booking.findUnique({
      where: { id },
      include: {
        services: true,
        studio: true,
        fonico: true,
        user: true,
      },
    })

    if (!booking) {
      throw new NotFoundException("Booking not found")
    }

    return booking
  }

  async remove(id: string, userId: string): Promise<Booking> {
    const booking = await this.findOne(id)

    await this.prisma.log.create({
      data: {
        action: "DELETE",
        userId,
        bookingId: id,
        oldBooking: booking,
      },
    })

    return this.prisma.booking.delete({
      where: { id },
    })
  }

  async getBookingStats(startDate: Date, endDate: Date): Promise<BookingStatsResponse> {
    const bookings = await this.prisma.booking.findMany({
      where: {
        start: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        services: true,
        studio: true,
        fonico: true,
        user: true,
      },
    })

    const bookingsByFonico = new Map<
      string,
      {
        fonicoId: string
        fonicoName: string
        bookingsCount: number
        revenue: number
      }
    >()

    const bookingsByStudio = new Map<
      string,
      {
        studioId: string
        bookingsCount: number
        revenue: number
      }
    >()

    let totalRevenue = 0

    for (const booking of bookings) {
      const studioPrice = booking.studio.price
      const servicesPrice = booking.services.reduce((sum, service) => sum + service.price, 0)
      const bookingRevenue = studioPrice + servicesPrice
      totalRevenue += bookingRevenue

      // Update fonico stats
      const fonicoStats = bookingsByFonico.get(booking.fonicoId) || {
        fonicoId: booking.fonicoId,
        fonicoName: booking.fonico.username,
        bookingsCount: 0,
        revenue: 0,
      }
      fonicoStats.bookingsCount++
      fonicoStats.revenue += bookingRevenue
      bookingsByFonico.set(booking.fonicoId, fonicoStats)

      // Update studio stats
      const studioStats = bookingsByStudio.get(booking.studioId) || {
        studioId: booking.studioId,
        bookingsCount: 0,
        revenue: 0,
      }
      studioStats.bookingsCount++
      studioStats.revenue += bookingRevenue
      bookingsByStudio.set(booking.studioId, studioStats)
    }

    const averageBookingDuration =
      bookings.reduce((acc, booking) => acc + (booking.end.getTime() - booking.start.getTime()), 0) /
      (bookings.length * 1000 * 60 * 60) // Convert to hours

    return {
      totalBookings: bookings.length,
      totalRevenue,
      bookingsByFonico: Array.from(bookingsByFonico.values()),
      bookingsByStudio: Array.from(bookingsByStudio.values()),
      averageBookingDuration,
    }
  }

  async getBookingsByEntity(entityId: string, startDate?: Date, endDate?: Date): Promise<BookingWithRelations[]> {
    return this.prisma.booking.findMany({
      where: {
        user: {
          entityId,
        },
        ...(startDate || endDate
          ? {
              start: {
                ...(startDate && { gte: startDate }),
                ...(endDate && { lte: endDate }),
              },
            }
          : {}),
      },
      include: {
        services: true,
        studio: true,
        fonico: true,
        user: true,
      },
      orderBy: {
        start: "asc",
      },
    })
  }

  async getBookingsByFonico(fonicoId: string, startDate?: Date, endDate?: Date): Promise<BookingWithRelations[]> {
    return this.prisma.booking.findMany({
      where: {
        fonicoId,
        ...(startDate || endDate
          ? {
              start: {
                ...(startDate && { gte: startDate }),
                ...(endDate && { lte: endDate }),
              },
            }
          : {}),
      },
      include: {
        services: true,
        studio: true,
        fonico: true,
        user: true,
      },
      orderBy: {
        start: "asc",
      },
    })
  }

  async getBookingsByStudio(studioId: string, startDate?: Date, endDate?: Date): Promise<BookingWithRelations[]> {
    return this.prisma.booking.findMany({
      where: {
        studioId,
        ...(startDate || endDate
          ? {
              start: {
                ...(startDate && { gte: startDate }),
                ...(endDate && { lte: endDate }),
              },
            }
          : {}),
      },
      include: {
        services: true,
        studio: true,
        fonico: true,
        user: true,
      },
      orderBy: {
        start: "asc",
      },
    })
  }

  async getBookingHistory(bookingId: string): Promise<
    Array<{
      action: Log["action"]
      time: Date
      user: string
      changes?: {
        old: any
        new: any
      }
    }>
  > {
    const logs = await this.prisma.log.findMany({
      where: {
        bookingId,
      },
      orderBy: {
        time: "desc",
      },
      include: {
        user: true,
      },
    })

    return logs.map((log) => ({
      action: log.action,
      time: log.time,
      user: log.user.username,
      changes: log.newBooking
        ? {
            old: log.oldBooking,
            new: log.newBooking,
          }
        : undefined,
    }))
  }

  async update(id: string, data: UpdateBookingDto): Promise<BookingWithRelations> {
    const booking = await this.findOne(id);
  
    if (
      data.start !== booking.start ||
      data.end !== booking.end ||
      data.studioId !== booking.studioId ||
      data.fonicoId !== booking.fonicoId
    ) {
      const isAvailable = await BookingFilterUtil.checkStudioAvailability(
        data.studioId || booking.studioId,
        data.fonicoId || booking.fonicoId,
        data.start || booking.start,
        data.end || booking.end,
        this.prisma,
        id
      );
  
      /* if (!isAvailable) {
        throw new BadRequestException("Time slot not available");
      } */
    }
  
    return this.prisma.booking.update({
      where: { id },
      data: {
        start: data.start,
        end: data.end,
        notes: data.notes,
        fonico: data.fonicoId ? { connect: { id: data.fonicoId } } : undefined,
        studio: data.studioId ? { connect: { id: data.studioId } } : undefined,
        services: data.services
          ? {
              set: data.services.map((id) => ({ id })),
            }
          : undefined,
        state: data.state,
      },
      include: {
        services: true,
        studio: true,
        fonico: true,
        user: true,
      },
    });
  }

  async findToConfirm(): Promise<BookingWithRelations[]> {
    //const filters: BookingFilters = BookingFilterUtil.createBookingFilters(query)

    /* switch (user.role) {
      case Role.USER:
        filters.userId = user.id
        break
      case Role.ENGINEER:
        filters.fonicoId = user.id
        break
      case Role.SECRETARY:
      case Role.ADMIN:
        break
    } */

    return this.prisma.booking.findMany({
      where: {
        state: BookingState.CONFERMATO
      },
      include: {
        services: true,
        studio: true,
        fonico: true,
        user: true,
      },
      orderBy: {
        start: "asc",
      },
    })
  }
}

