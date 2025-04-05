import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common"
import { PrismaService } from "../prisma/prisma.service"
import type { CreateAvailabilityDto } from "./dto/availability.dto"
import { DateUtils } from "../utils/date.utils"

@Injectable()
export class AvailabilityService {
  constructor(private prisma: PrismaService) { }

  async getEngineerAvailability(engineerId: string, date: Date) {
    const availabilities = await this.prisma.availability.findMany({
      where: { userId: engineerId },
    })

    console.log(date)

    const weekDays = DateUtils.getWeekDays(date)
    console.log(weekDays)

    return weekDays.flatMap((day) => {
      const dayAvailabilities = availabilities.filter((a) => a.day.toLowerCase() === day.dayName.toLowerCase())
      console.log(dayAvailabilities)
      return dayAvailabilities.map((a) => ({
        id: a.id,
        day: a.day,
        start: a.start,
        end: a.end,
        userId: a.userId,
      }))
    })
  }

  async getWeeklyAvailability(engineerId: string) {
    return this.prisma.availability.findMany({
      where: { userId: engineerId },
    })
  }

  // Modifica il metodo createAvailability per gestire meglio le disponibilità oltre la mezzanotte
  async createAvailability(userId: string, data: CreateAvailabilityDto) {
    // Get existing availabilities for the same day
    const existingAvailabilities = await this.prisma.availability.findMany({
      where: {
        userId,
        day: data.day,
      },
    })

    // Convert time strings to minutes for comparison
    const newStart = this.timeStringToMinutes(data.start)
    const newEnd = this.timeStringToMinutes(data.end)

    // Gestisci il caso in cui l'orario di fine è prima dell'orario di inizio (attraversa la mezzanotte)
    const adjustedNewEnd = newEnd < newStart ? newEnd + 24 * 60 : newEnd

    if (newStart >= adjustedNewEnd) {
      throw new BadRequestException("Start time must be before end time")
    }

    // Check for overlapping or adjacent availabilities to merge them
    const overlappingRanges: { start: number; end: number; id: string }[] = []

    // Add the new availability range
    overlappingRanges.push({
      start: newStart,
      end: adjustedNewEnd,
      id: "new",
    })

    // Add existing availabilities
    for (const existing of existingAvailabilities) {
      const existingStart = this.timeStringToMinutes(existing.start)
      let existingEnd = this.timeStringToMinutes(existing.end)

      // Gestisci il caso in cui l'orario di fine è prima dell'orario di inizio (attraversa la mezzanotte)
      if (existingEnd < existingStart) {
        existingEnd += 24 * 60 // Aggiungi 24 ore in minuti
      }

      overlappingRanges.push({
        start: existingStart,
        end: existingEnd,
        id: existing.id,
      })
    }

    // Sort by start time
    overlappingRanges.sort((a, b) => a.start - b.start)

    // Merge overlapping or adjacent ranges
    const mergedRanges = DateUtils.mergeTimeRanges(overlappingRanges)

    // Delete existing availabilities that were merged
    for (const range of mergedRanges) {
      const existingIds = range.ids.filter((id) => id !== "new")
      if (existingIds.length > 0) {
        await this.prisma.availability.deleteMany({
          where: {
            id: {
              in: existingIds,
            },
          },
        })
      }
    }

    // Create new availabilities for each merged range
    const createdAvailabilities = []
    for (const range of mergedRanges) {
      // Normalizza l'orario di fine se supera le 24 ore
      const startTime = this.minutesToTimeString(range.start)
      let endTime = this.minutesToTimeString(range.end % (24 * 60))

      // Se l'orario di fine è 00:00, impostalo a 24:00
      if (endTime === "00:00") {
        endTime = "24:00"
      }

      const created = await this.prisma.availability.create({
        data: {
          day: data.day,
          start: startTime,
          end: endTime,
          user: { connect: { id: userId } },
        },
      })

      createdAvailabilities.push(created)
    }

    return createdAvailabilities
  }

  // Modifica il metodo updateAvailability per evitare di eliminare e ricreare la disponibilità
  async updateAvailability(id: string, data: CreateAvailabilityDto) {
    const availability = await this.prisma.availability.findUnique({
      where: { id },
    })

    if (!availability) {
      throw new NotFoundException("Availability not found")
    }

    // Invece di eliminare e ricreare, aggiorniamo direttamente la disponibilità esistente
    return this.prisma.availability.update({
      where: { id },
      data: {
        day: data.day,
        start: data.start,
        end: data.end,
      },
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

  // Helper methods for time conversion
  private timeStringToMinutes(timeString: string): number {
    const [hours, minutes] = timeString.split(":").map(Number)
    return hours * 60 + minutes
  }

  private minutesToTimeString(minutes: number): string {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}`
  }
}

