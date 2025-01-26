import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common"
import { PrismaService } from "../prisma/prisma.service"
import type { CreateAvailabilityDto } from "./dto/availability.dto"
import { DateUtils } from "../utils/date.utils"

@Injectable()
export class AvailabilityService {
  constructor(private prisma: PrismaService) {}

  async getFonicoAvailability(fonicoId: string, date: Date) {
    const [availabilities, bookings] = await Promise.all([
      this.prisma.availability.findMany({
        where: { userId: fonicoId },
      }),
      this.prisma.booking.findMany({
        where: {
          fonicoId,
          start: {
            gte: DateUtils.getWeekDays(date)[0].date,
            lte: DateUtils.getWeekDays(date)[6].date,
          },
        },
      }),
    ])

    const weekDays = DateUtils.getWeekDays(date)

    return weekDays.map((day) => {
      const dayAvailabilities = availabilities.filter((a) => a.day.toLowerCase() === day.dayName.toLowerCase())

      const dayBookings = bookings.filter((b) => DateUtils.formatTime(b.start) === day.formatted)

      return {
        date: day.date,
        dayName: day.dayName,
        availableSlots: this.calculateAvailableSlots(dayAvailabilities, dayBookings),
      }
    })
  }

  async createAvailability(userId: string, data: CreateAvailabilityDto) {
    // Verifica sovrapposizioni
    const existingAvailability = await this.prisma.availability.findFirst({
      where: {
        userId,
        day: data.day,
        OR: [
          {
            AND: [{ start: { lte: data.start } }, { end: { gt: data.start } }],
          },
          {
            AND: [{ start: { lt: data.end } }, { end: { gte: data.end } }],
          },
        ],
      },
    })

    if (existingAvailability) {
      throw new BadRequestException("Overlapping availability exists")
    }

    return this.prisma.availability.create({
      data: {
        ...data,
        user: { connect: { id: userId } },
      },
    })
  }

  async updateAvailability(id: string, data: CreateAvailabilityDto) {
    const availability = await this.prisma.availability.findUnique({
      where: { id },
    })

    if (!availability) {
      throw new NotFoundException("Availability not found")
    }

    // Verifica sovrapposizioni escludendo l'attuale disponibilità
    const existingAvailability = await this.prisma.availability.findFirst({
      where: {
        id: { not: id },
        userId: availability.userId,
        day: data.day,
        OR: [
          {
            AND: [{ start: { lte: data.start } }, { end: { gt: data.start } }],
          },
          {
            AND: [{ start: { lt: data.end } }, { end: { gte: data.end } }],
          },
        ],
      },
    })

    if (existingAvailability) {
      throw new BadRequestException("Overlapping availability exists")
    }

    return this.prisma.availability.update({
      where: { id },
      data,
    })
  }

  async deleteAvailability(id: string) {
    const availability = await this.prisma.availability.findUnique({
      where: { id },
    })

    if (!availability) {
      throw new NotFoundException("Availability not found")
    }

    return this.prisma.availability.delete({
      where: { id },
    })
  }

  private calculateAvailableSlots(
    availabilities: Array<{ start: Date; end: Date }>,
    bookings: Array<{ start: Date; end: Date }>,
  ) {
    return availabilities.flatMap((availability) => {
      const slots = []
      let currentTime = availability.start

      while (currentTime < availability.end) {
        const slotEnd = new Date(currentTime.getTime() + 30 * 60000) // 30 minuti

        if (DateUtils.checkAvailability(currentTime, slotEnd, [availability], bookings)) {
          slots.push({
            start: DateUtils.formatTime(currentTime),
            end: DateUtils.formatTime(slotEnd),
          })
        }

        currentTime = slotEnd
      }

      return slots
    })
  }
}

