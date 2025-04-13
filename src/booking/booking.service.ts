import { Injectable, BadRequestException, NotFoundException } from "@nestjs/common"
import { PrismaService } from "../prisma/prisma.service"
import type { CreateBookingDto, UpdateBookingDto, BookingStatsResponse, BookingFilters } from "./dto/booking.dto"
import { BookingFilters as BookingFilterUtil } from "../utils/booking-filter.util"
import { type Booking, Role, type User, type Log, BookingState, HolidayState } from "@prisma/client"
import { StateType } from "utils/types"
import { addDays, format, isWithinInterval, setHours, setMinutes, startOfDay } from "date-fns"

type BookingWithRelations = Booking & {
  services: Array<{ id: string; price: number }>
  studio: { price: number }
  fonico: { username: string } | null  // Permetti che fonico possa essere null
  user: User | null  // Se anche l'utente può essere null, aggiungilo
}


interface StudioAvailability {
  id: string
  name: string
  isAvailable: boolean
  alternativeSlots?: {
    start: string
    end: string
  }[]
}

interface EngineerAvailability {
  id: string
  username: string
  isAvailable: boolean
  alternativeSlots?: {
    start: string
    end: string
  }[]
}

export interface TimeSlot {
  start: string;
  end: string;
}

export interface AvailabilityDay {
  date: string;
  slots: TimeSlot[];
  isUnavailable?: boolean;
}

interface TimeRange {
  start: Date
  end: Date
}

@Injectable()
export class BookingService {
  constructor(private prisma: PrismaService) { }

  async create(data: CreateBookingDto, userId: string): Promise<BookingWithRelations> {
    /* const isAvailable = await BookingFilterUtil.checkStudioAvailability(
      data.studioId,
      data.fonicoId,
      data.start,
      data.end,
      this.prisma,
    ) */

    /* if (!isAvailable) {
      throw new BadRequestException("Time slot not available")
    } */


    return this.prisma.booking.create({
      data: {
        start: data.start,
        end: data.end,
        state: data.state,
        notes: data.notes ?? null,
        instagram: data.instagram,
        phone: data.phone,
        studio: { connect: { id: data.studioId } },
        services: {
          connect: data.services?.map((id) => ({ id })) ?? [],
        },
        user: data.userId ? { connect: { id: data.userId } } : { connect: { id: "cm8z07nn20003mytvvatk4fvd" } },
        fonico: data.fonicoId ? { connect: { id: data.fonicoId } } : { connect: { id: "cm8z06fn00002mytvfftqrkgx" } },
        booked_by: userId ? { connect: { id: userId } } : { connect: { id: "cm8z07nn20003mytvvatk4fvd" } },
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

  async findEngineerBookings(id: string): Promise<(BookingWithRelations & { isWithinAvailability: boolean })[]> {
    const now = new Date()

    // Get all future bookings for this engineer
    const bookings = await this.prisma.booking.findMany({
      where: {
        state: BookingState.CONFERMATO,
        fonicoId: id,
        start: {
          gte: now,
        },
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

    // Get engineer's availability settings
    const engineerAvailability = await this.prisma.availability.findMany({
      where: {
        userId: id,
      },
    })

    // Map of day names to day numbers (0 = Sunday, 1 = Monday, etc.)
    const dayMap: Record<string, number> = {
      sun: 0,
      mon: 1,
      tue: 2,
      wed: 3,
      thu: 4,
      fri: 5,
      sat: 6,
    }

    // Check each booking against availability
    const bookingsWithAvailabilityCheck = bookings.map((booking) => {
      const bookingStart = new Date(booking.start)
      const bookingEnd = new Date(booking.end)
      const dayOfWeek = bookingStart.getDay() // 0 = Sunday, 1 = Monday, etc.

      // Find the day name for this booking
      const dayName = Object.keys(dayMap)
        .find((key) => dayMap[key] === dayOfWeek)
        ?.toLowerCase()

      if (!dayName) {
        return { ...booking, isWithinAvailability: false }
      }

      // Get availability for this day of the week
      const dayAvailability = engineerAvailability.filter((a) => a.day.toLowerCase() === dayName)

      // If no availability is set for this day, it's outside availability
      if (dayAvailability.length === 0) {
        return { ...booking, isWithinAvailability: false }
      }

      // Check if booking falls within any of the availability slots for this day
      const isWithinAvailability = dayAvailability.some((slot) => {
        // Parse start and end times from availability
        const [startHour, startMinute] = slot.start.split(":").map(Number)
        const [endHour, endMinute] = slot.end.split(":").map(Number)

        // Create date objects for this availability slot on the same day as the booking
        const availabilityStart = new Date(bookingStart)
        availabilityStart.setHours(startHour, startMinute, 0, 0)

        const availabilityEnd = new Date(bookingStart)
        availabilityEnd.setHours(endHour, endMinute, 0, 0)

        // Handle times that cross midnight
        if (availabilityEnd < availabilityStart) {
          availabilityEnd.setDate(availabilityEnd.getDate() + 1)
        }

        // Check if booking is completely within this availability slot
        return bookingStart >= availabilityStart && bookingEnd <= availabilityEnd
      })

      return { ...booking, isWithinAvailability }
    })

    return bookingsWithAvailabilityCheck
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

  /* async getBookingStats(startDate: Date, endDate: Date): Promise<BookingStatsResponse> {
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
  } */

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

  async getBookingsByFonico(fonicoId: string): Promise<BookingWithRelations[]> {
    console.log("id del fonico: ",fonicoId)
    return this.prisma.booking.findMany({
      where: {
        fonicoId: fonicoId,
        state: "CONFERMATO"
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

  async getBookingsByUser(userId: string) {
    return this.prisma.booking.findMany({
      where: {
        userId: userId,
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

    /* if (
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

      if (!isAvailable) {
        throw new BadRequestException("Time slot not available");
      } 
    } */
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

  async findAvailableEngineers(start: Date, end: Date): Promise<EngineerAvailability[]> {
    // Get all engineers (users with ENGINEER role)
    const engineers = await this.prisma.user.findMany({
      where: {
        role: Role.ENGINEER,
      },
      select: {
        id: true,
        username: true,
      },
    })
  
    // Calculate the duration of the requested booking in minutes
    const durationMinutes = Math.round((end.getTime() - start.getTime()) / (1000 * 60))
  
    // Define operating hours (10:00 to 23:00 Italian time)
    const operatingStartHour = 10
    const operatingEndHour = 23
  
    const result: EngineerAvailability[] = []
  
    // Get the day of the week for the requested date
    const dayOfWeek = start.getDay() // 0 = Sunday, 1 = Monday, etc.
  
    // Map day number to day name
    const dayMap: Record<number, string> = {
      0: "sun",
      1: "mon",
      2: "tue",
      3: "wed",
      4: "thu",
      5: "fri",
      6: "sat",
    }
  
    const dayName = dayMap[dayOfWeek]
    
    // Get all studios for checking availability
    const allStudios = await this.prisma.studio.findMany({
      select: {
        id: true,
        value: true,
      },
    })
  
    // Check availability for each engineer
    for (const engineer of engineers) {
      // Check if the engineer has availability set for this day of the week
      const engineerAvailability = await this.prisma.availability.findMany({
        where: {
          userId: engineer.id,
          day: {
            equals: dayName,
            mode: "insensitive",
          },
        },
      })
  
      // Check if the engineer has any holidays/time off that overlap with the requested time
      const engineerHolidays = await this.prisma.holiday.findMany({
        where: {
          userId: engineer.id,
          state: HolidayState.CONFERMATO,
          OR: [
            {
              // Holiday starts during the requested time
              start: {
                gte: start,
                lt: end,
              },
            },
            {
              // Holiday ends during the requested time
              end: {
                gt: start,
                lte: end,
              },
            },
            {
              // Holiday completely encompasses the requested time
              start: {
                lte: start,
              },
              end: {
                gte: end,
              },
            },
          ],
        },
      })
  
      // Check if the engineer has any bookings that overlap with the requested time
      const engineerBookings = await this.prisma.booking.findMany({
        where: {
          fonicoId: engineer.id,
          state: BookingState.CONFERMATO,
          OR: [
            {
              // Booking starts during the requested time
              start: {
                gte: start,
                lt: end,
              },
            },
            {
              // Booking ends during the requested time
              end: {
                gt: start,
                lte: end,
              },
            },
            {
              // Booking completely encompasses the requested time
              start: {
                lte: start,
              },
              end: {
                gte: end,
              },
            },
          ],
        },
      })
  
      // If the engineer has no availability for this day, they're not available
      if (engineerAvailability.length === 0) {
        // Find alternative slots on other days with available studios
        const alternativeSlots = await this.findNextAvailableEngineerSlotsWithStudios(
          engineer.id,
          start,
          end,
          durationMinutes,
          operatingStartHour,
          operatingEndHour,
          allStudios,
        )
  
        result.push({
          id: engineer.id,
          username: engineer.username,
          isAvailable: false,
          alternativeSlots,
        })
        continue
      }
  
      // Check if the requested time falls within any of the engineer's availability slots
      let isAvailableDuringRequestedTime = false
  
      for (const slot of engineerAvailability) {
        // Parse start and end times from availability
        const [startHour, startMinute] = slot.start.split(":").map(Number)
        const [endHour, endMinute] = slot.end.split(":").map(Number)
  
        // Create date objects for this availability slot on the same day as the booking
        const availabilityStart = new Date(start)
        availabilityStart.setHours(startHour, startMinute, 0, 0)
  
        const availabilityEnd = new Date(start)
        availabilityEnd.setHours(endHour, endMinute, 0, 0)
  
        // Handle times that cross midnight
        if (availabilityEnd < availabilityStart) {
          availabilityEnd.setDate(availabilityEnd.getDate() + 1)
        }
  
        // Check if the requested time is completely within this availability slot
        if (start >= availabilityStart && end <= availabilityEnd) {
          isAvailableDuringRequestedTime = true
          break
        }
      }
  
      // If the engineer has holidays or bookings during the requested time, they're not available
      if (engineerHolidays.length > 0 || engineerBookings.length > 0) {
        isAvailableDuringRequestedTime = false
      }
  
      if (isAvailableDuringRequestedTime) {
        result.push({
          id: engineer.id,
          username: engineer.username,
          isAvailable: true,
        })
      } else {
        // Find alternative slots with available studios
        const alternativeSlots = await this.findNextAvailableEngineerSlotsWithStudios(
          engineer.id,
          start,
          end,
          durationMinutes,
          operatingStartHour,
          operatingEndHour,
          allStudios,
        )
  
        result.push({
          id: engineer.id,
          username: engineer.username,
          isAvailable: false,
          alternativeSlots,
        })
      }
    }
  
    return result
  }
  
  // New method to find slots with available studios
  private async findNextAvailableEngineerSlotsWithStudios(
    engineerId: string,
    requestedStart: Date,
    requestedEnd: Date,
    durationMinutes: number,
    operatingStartHour: number,
    operatingEndHour: number,
    studios: { id: string; value: any }[],
  ): Promise<{ start: string; end: string; availableStudios: string[] }[]> {
    // Get all future bookings for this engineer starting from the beginning of the requested day
    const futureBookings = await this.prisma.booking.findMany({
      where: {
        fonicoId: engineerId,
        state: BookingState.CONFERMATO,
        start: {
          gte: startOfDay(requestedStart),
        },
      },
      orderBy: {
        start: "asc",
      },
      select: {
        start: true,
        end: true,
      },
    })
  
    // Get all holidays for this engineer
    const holidays = await this.prisma.holiday.findMany({
      where: {
        userId: engineerId,
        state: HolidayState.CONFERMATO,
        end: {
          gte: startOfDay(requestedStart),
        },
      },
      orderBy: {
        start: "asc",
      },
      select: {
        start: true,
        end: true,
      },
    })
  
    // Get engineer's weekly availability
    const weeklyAvailability = await this.prisma.availability.findMany({
      where: {
        userId: engineerId,
      },
    })
  
    const alternativeSlots: { start: string; end: string; availableStudios: string[] }[] = []
    let slotsFound = 0
    let daysSearched = 0
    const maxDaysToSearch = 14 // Limit search to 14 days in the future
    const maxEndTime = 22 // Studio closes at 22:00
  
    // Create a list of all unavailable periods (bookings and holidays)
    const unavailablePeriods = [
      ...futureBookings.map((booking) => ({
        start: new Date(booking.start),
        end: new Date(booking.end),
      })),
      ...holidays.map((holiday) => ({
        start: new Date(holiday.start),
        end: new Date(holiday.end),
      })),
    ]
  
    // Sort unavailable periods by start time
    unavailablePeriods.sort((a, b) => a.start.getTime() - b.start.getTime())
  
    // Map day numbers to day names
    const dayMap: Record<number, string> = {
      0: "sun",
      1: "mon",
      2: "tue",
      3: "wed",
      4: "thu",
      5: "fri",
      6: "sat",
    }
  
    // Start searching from the requested start time (to find closest slots)
    let currentDate = new Date(requestedStart)
    let currentDay = currentDate.getDate()
  
    while (slotsFound < 2 && daysSearched < maxDaysToSearch) {
      // If we've moved to a new day, reset to operating start hour
      if (currentDate.getDate() !== currentDay) {
        currentDay = currentDate.getDate()
        currentDate.setHours(operatingStartHour, 0, 0, 0)
        daysSearched++
      }
  
      // Get the day of the week for the current date
      const dayOfWeek = currentDate.getDay()
      const dayName = dayMap[dayOfWeek].toLowerCase()
  
      // Get engineer's availability for this day of the week
      const dayAvailability = weeklyAvailability.filter((a) => a.day.toLowerCase() === dayName)
  
      // If engineer has no availability for this day, move to next day
      if (dayAvailability.length === 0) {
        currentDate.setDate(currentDate.getDate() + 1)
        currentDate.setHours(operatingStartHour, 0, 0, 0)
        daysSearched++
        continue
      }
  
      // Check each availability slot for this day
      let foundSlotForToday = false
  
      for (const slot of dayAvailability) {
        if (foundSlotForToday) break
  
        // Parse start and end times from availability
        const [startHour, startMinute] = slot.start.split(":").map(Number)
        const [endHour, endMinute] = slot.end.split(":").map(Number)
  
        // Create date objects for this availability slot
        let availabilityStart = new Date(currentDate)
        availabilityStart.setHours(startHour, startMinute, 0, 0)
  
        const availabilityEnd = new Date(currentDate)
        availabilityEnd.setHours(endHour, endMinute, 0, 0)
  
        // Handle times that cross midnight
        if (availabilityEnd < availabilityStart) {
          availabilityEnd.setDate(availabilityEnd.getDate() + 1)
        }
  
        // If current time is after the end of this availability slot, skip to next slot
        if (currentDate > availabilityEnd) {
          continue
        }
  
        // If current time is within this availability slot, adjust start time
        if (currentDate > availabilityStart) {
          availabilityStart = new Date(currentDate)
        }
  
        // Try to find a free slot within this availability period
        const slotStart = new Date(availabilityStart)
  
        while (slotStart.getTime() + durationMinutes * 60 * 1000 <= availabilityEnd.getTime()) {
          const slotEnd = new Date(slotStart.getTime() + durationMinutes * 60 * 1000)
  
          // Check if slot ends after max end time (22:00)
          if (slotEnd.getHours() > maxEndTime || (slotEnd.getHours() === maxEndTime && slotEnd.getMinutes() > 0)) {
            // Move to next day
            break
          }
  
          // Check if this potential slot overlaps with any unavailable period
          const isUnavailable = unavailablePeriods.some((period) =>
            isOverlapping(slotStart, slotEnd, period.start, period.end),
          )
  
          if (!isUnavailable) {
            // Check which studios are available during this slot
            const availableStudios = await this.findAvailableStudiosForSlot(slotStart, slotEnd, studios);
            
            // Only consider this slot if there are available studios
            if (availableStudios.length > 0) {
              // Found an available slot with available studios!
              alternativeSlots.push({
                start: format(slotStart, "yyyy-MM-dd'T'HH:mm:ss"),
                end: format(slotEnd, "yyyy-MM-dd'T'HH:mm:ss"),
                availableStudios: availableStudios,
              })
  
              slotsFound++
              foundSlotForToday = true
  
              // Move past this slot to look for the next one
              currentDate = new Date(slotEnd)
              break
            }
          }
  
          // Try the next possible start time (increment by 30 minutes)
          slotStart.setMinutes(slotStart.getMinutes() + 30)
        }
      }
  
      // If we didn't find a slot today, move to the next day
      if (!foundSlotForToday) {
        currentDate.setDate(currentDate.getDate() + 1)
        currentDate.setHours(operatingStartHour, 0, 0, 0)
        daysSearched++
      }
    }
  
    return alternativeSlots
  }
  
  // Helper method to find available studios for a specific time slot
  private async findAvailableStudiosForSlot(
    start: Date,
    end: Date,
    studios: { id: string; value: any }[],
  ): Promise<string[]> {
    const availableStudios: string[] = [];
  
    // Check each studio for availability during this slot
    for (const studio of studios) {
      // Get all confirmed bookings for this studio that might overlap with the requested time
      const overlappingBookings = await this.prisma.booking.findMany({
        where: {
          studioId: studio.id,
          state: BookingState.CONFERMATO,
          OR: [
            {
              // Booking starts during the requested time
              start: {
                gte: start,
                lt: end,
              },
            },
            {
              // Booking ends during the requested time
              end: {
                gt: start,
                lte: end,
              },
            },
            {
              // Booking completely encompasses the requested time
              start: {
                lte: start,
              },
              end: {
                gte: end,
              },
            },
          ],
        },
      });
  
      // If no overlapping bookings, the studio is available
      if (overlappingBookings.length === 0) {
        availableStudios.push(studio.id);
      }
    }
  
    return availableStudios;
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
        state: {
          in: [BookingState.CONTATTARE, BookingState.CONTATTATO]
        }
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


  async findCurrentBookings(): Promise<BookingWithRelations[]> {
    const now = new Date()

    return this.prisma.booking.findMany({
      where: {
        state: BookingState.CONFERMATO,
        start: {
          lte: now,
        },
        end: {
          gte: now,
        },
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


  async findAvailableTimeSlots(studioId: string, fonicoId: string): Promise<AvailabilityDay[]> {
    const now = new Date()
    const nextWeek = addDays(now, 7)

    // Get all bookings for the studio and fonico in the next 7 days
    const studioBookings = await this.prisma.booking.findMany({
      where: {
        studioId,
        state: BookingState.CONFERMATO,
        start: {
          gte: now,
          lt: nextWeek,
        },
      },
      select: {
        start: true,
        end: true,
      },
    })

    const fonicoBookings = await this.prisma.booking.findMany({
      where: {
        fonicoId,
        state: BookingState.CONFERMATO,
        start: {
          gte: now,
          lt: nextWeek,
        },
      },
      select: {
        start: true,
        end: true,
      },
    })

    // Get fonico's weekly availability
    const fonicoAvailability = await this.prisma.availability.findMany({
      where: {
        userId: fonicoId,
      },
    })

    // Get fonico's holidays and time off
    const fonicoHolidays = await this.prisma.holiday.findMany({
      where: {
        userId: fonicoId,
        state: HolidayState.CONFERMATO,
        start: {
          lt: nextWeek,
        },
        end: {
          gte: now,
        },
      },
    })

    // Generate availability for each day
    const result: AvailabilityDay[] = []

    // Map of day names to day numbers (0 = Sunday, 1 = Monday, etc.)
    const dayMap: Record<string, number> = {
      sun: 0,
      mon: 1,
      tue: 2,
      wed: 3,
      thu: 4,
      fri: 5,
      sat: 6,
    }

    // Process each day for the next 7 days
    for (let i = 0; i < 7; i++) {
      const currentDate = addDays(now, i)
      const dayOfWeek = currentDate.getDay() // 0 = Sunday, 1 = Monday, etc.

      // Find the day name for the current day
      const dayName = Object.keys(dayMap)
        .find((key) => dayMap[key] === dayOfWeek)
        ?.toLowerCase()

      if (!dayName) continue

      // Get fonico's availability for this day of the week
      const dayAvailability = fonicoAvailability.filter((a) => a.day.toLowerCase() === dayName)

      // If fonico has no availability for this day, mark as unavailable
      if (dayAvailability.length === 0) {
        result.push({
          date: format(currentDate, "yyyy-MM-dd"),
          slots: [],
          isUnavailable: true,
        })
        continue
      }

      // Process each availability slot for this day
      const availableSlots: TimeSlot[] = []

      for (const slot of dayAvailability) {
        // Parse start and end times
        const [startHour, startMinute] = slot.start.split(":").map(Number)
        const [endHour, endMinute] = slot.end.split(":").map(Number)

        // Create date objects for this slot
        const slotStart = setMinutes(setHours(currentDate, startHour), startMinute)
        const slotEnd = setMinutes(setHours(currentDate, endHour), endMinute)

        // Handle times that cross midnight
        if (slotEnd < slotStart) {
          slotEnd.setDate(slotEnd.getDate() + 1)
        }

        // Skip if the slot is in the past
        if (slotEnd < now) continue

        // Collect all unavailable periods (bookings and holidays)
        const unavailablePeriods: TimeRange[] = []

        // Add bookings to unavailable periods
        studioBookings.forEach((booking) => {
          if (isOverlapping(slotStart, slotEnd, new Date(booking.start), new Date(booking.end))) {
            unavailablePeriods.push({
              start: new Date(booking.start),
              end: new Date(booking.end),
            })
          }
        })

        fonicoBookings.forEach((booking) => {
          if (isOverlapping(slotStart, slotEnd, new Date(booking.start), new Date(booking.end))) {
            unavailablePeriods.push({
              start: new Date(booking.start),
              end: new Date(booking.end),
            })
          }
        })

        // Add holidays to unavailable periods
        fonicoHolidays.forEach((holiday) => {
          const holidayStart = new Date(holiday.start)
          const holidayEnd = new Date(holiday.end)

          if (isOverlapping(slotStart, slotEnd, holidayStart, holidayEnd)) {
            unavailablePeriods.push({
              start: holidayStart,
              end: holidayEnd,
            })
          }
        })

        // If there are no unavailable periods, add the entire slot
        if (unavailablePeriods.length === 0) {
          availableSlots.push({
            start: format(slotStart, "HH:mm"),
            end: format(slotEnd, "HH:mm"),
          })
          continue
        }

        // Sort unavailable periods by start time
        unavailablePeriods.sort((a, b) => a.start.getTime() - b.start.getTime())

        // Merge overlapping unavailable periods
        const mergedUnavailablePeriods: TimeRange[] = []
        let currentPeriod = unavailablePeriods[0]

        for (let i = 1; i < unavailablePeriods.length; i++) {
          const period = unavailablePeriods[i]

          // If current period overlaps with next period, merge them
          if (isOverlapping(currentPeriod.start, currentPeriod.end, period.start, period.end)) {
            currentPeriod.end = new Date(Math.max(currentPeriod.end.getTime(), period.end.getTime()))
          } else {
            // No overlap, add current period and start a new one
            mergedUnavailablePeriods.push(currentPeriod)
            currentPeriod = period
          }
        }

        // Add the last period
        mergedUnavailablePeriods.push(currentPeriod)

        // Find available gaps between unavailable periods
        let currentStart = new Date(slotStart)

        for (const period of mergedUnavailablePeriods) {
          // If there's a gap before this period, add it as an available slot
          if (currentStart < period.start) {
            availableSlots.push({
              start: format(currentStart, "HH:mm"),
              end: format(period.start, "HH:mm"),
            })
          }

          // Move current start to the end of this period
          if (period.end > currentStart) {
            currentStart = new Date(period.end)
          }
        }

        // Check if there's a gap after the last period
        if (currentStart < slotEnd) {
          availableSlots.push({
            start: format(currentStart, "HH:mm"),
            end: format(slotEnd, "HH:mm"),
          })
        }
      }

      result.push({
        date: format(currentDate, "yyyy-MM-dd"),
        slots: availableSlots,
        isUnavailable: availableSlots.length === 0,
      })
    }

    return result
  }

  async findAvailableStudios(start: Date, end: Date): Promise<StudioAvailability[]> {
    // Get all studios
    const studios = await this.prisma.studio.findMany({
      select: {
        id: true,
        value: true,
      },
    })

    // Calculate the duration of the requested booking in minutes
    const durationMinutes = Math.round((end.getTime() - start.getTime()) / (1000 * 60))

    // Define studio operating hours (10:00 to 23:00 Italian time)
    const operatingStartHour = 10
    const operatingEndHour = 23

    const result: StudioAvailability[] = []

    // Check availability for each studio
    for (const studio of studios) {
      // Get all confirmed bookings for this studio that might overlap with the requested time
      const overlappingBookings = await this.prisma.booking.findMany({
        where: {
          studioId: studio.id,
          state: BookingState.CONFERMATO,
          OR: [
            {
              // Booking starts during the requested time
              start: {
                gte: start,
                lt: end,
              },
            },
            {
              // Booking ends during the requested time
              end: {
                gt: start,
                lte: end,
              },
            },
            {
              // Booking completely encompasses the requested time
              start: {
                lte: start,
              },
              end: {
                gte: end,
              },
            },
          ],
        },
        orderBy: {
          start: "asc",
        },
      })

      // If no overlapping bookings, the studio is available
      if (overlappingBookings.length === 0) {
        result.push({
          id: studio.id,
          name: studio.value.toString(),
          isAvailable: true,
        })
        continue
      }

      // Studio is not available, find alternative slots
      const alternativeSlots = await this.findNextAvailableSlots(
        studio.id,
        start,
        end,
        durationMinutes,
        operatingStartHour,
        operatingEndHour,
      )

      result.push({
        id: studio.id,
        name: studio.value.toString(),
        isAvailable: false,
        alternativeSlots,
      })
    }

    return result
  }

  private async findNextAvailableSlots(
    studioId: string,
    requestedStart: Date,
    requestedEnd: Date,
    durationMinutes: number,
    operatingStartHour: number,
    operatingEndHour: number,
  ): Promise<{ start: string; end: string }[]> {
    // Get all future bookings for this studio
    const futureBookings = await this.prisma.booking.findMany({
      where: {
        studioId,
        state: BookingState.CONFERMATO,
        start: {
          gte: startOfDay(requestedStart), // Start from the beginning of the requested day
        },
      },
      orderBy: {
        start: "asc",
      },
      select: {
        start: true,
        end: true,
      },
    })

    const alternativeSlots: { start: string; end: string }[] = []
    let slotsFound = 0
    let daysSearched = 0
    const maxDaysToSearch = 14 // Limit search to 14 days in the future
    const maxEndTime = 22 // Studio closes at 22:00

    // Create a list of all booked periods
    const bookedPeriods = futureBookings.map((booking) => ({
      start: new Date(booking.start),
      end: new Date(booking.end),
    }))

    // Sort booked periods by start time
    bookedPeriods.sort((a, b) => a.start.getTime() - b.start.getTime())

    // Start searching from the requested start time (to find closest slots)
    let currentDate = new Date(requestedStart)
    let currentDay = currentDate.getDate()

    while (slotsFound < 2 && daysSearched < maxDaysToSearch) {
      // If we've moved to a new day, reset to operating start hour
      if (currentDate.getDate() !== currentDay) {
        currentDay = currentDate.getDate()
        currentDate.setHours(operatingStartHour, 0, 0, 0)
        daysSearched++
      }

      // Reset to operating start hour if we're before opening
      if (currentDate.getHours() < operatingStartHour) {
        currentDate.setHours(operatingStartHour, 0, 0, 0)
      }

      // Calculate potential end time for a slot starting at currentDate
      const potentialEndTime = new Date(currentDate.getTime() + durationMinutes * 60 * 1000)

      // Check if this potential slot extends beyond operating hours (22:00)
      if (
        potentialEndTime.getHours() > maxEndTime ||
        (potentialEndTime.getHours() === maxEndTime && potentialEndTime.getMinutes() > 0)
      ) {
        // Move to next day's opening time
        currentDate.setDate(currentDate.getDate() + 1)
        currentDate.setHours(operatingStartHour, 0, 0, 0)
        daysSearched++
        continue
      }

      // Check if this potential slot overlaps with any booking
      const overlappingBooking = bookedPeriods.find((period) =>
        isOverlapping(currentDate, potentialEndTime, period.start, period.end),
      )

      if (!overlappingBooking) {
        // Found an available slot!
        alternativeSlots.push({
          start: format(currentDate, "yyyy-MM-dd'T'HH:mm:ss"),
          end: format(potentialEndTime, "yyyy-MM-dd'T'HH:mm:ss"),
        })

        slotsFound++

        // Move past this slot to look for the next one
        currentDate = new Date(potentialEndTime)
      } else {
        // Move to the end of the overlapping booking
        currentDate = new Date(overlappingBooking.end)
      }
    }

    return alternativeSlots
  }

  private async findNextAvailableEngineerSlots(
    engineerId: string,
    requestedStart: Date,
    requestedEnd: Date,
    durationMinutes: number,
    operatingStartHour: number,
    operatingEndHour: number,
  ): Promise<{ start: string; end: string }[]> {
    // Get all future bookings for this engineer starting from the beginning of the requested day
    const futureBookings = await this.prisma.booking.findMany({
      where: {
        fonicoId: engineerId,
        state: BookingState.CONFERMATO,
        start: {
          gte: startOfDay(requestedStart),
        },
      },
      orderBy: {
        start: "asc",
      },
      select: {
        start: true,
        end: true,
      },
    })

    // Get all holidays for this engineer
    const holidays = await this.prisma.holiday.findMany({
      where: {
        userId: engineerId,
        state: HolidayState.CONFERMATO,
        end: {
          gte: startOfDay(requestedStart),
        },
      },
      orderBy: {
        start: "asc",
      },
      select: {
        start: true,
        end: true,
      },
    })

    // Get engineer's weekly availability
    const weeklyAvailability = await this.prisma.availability.findMany({
      where: {
        userId: engineerId,
      },
    })

    const alternativeSlots: { start: string; end: string }[] = []
    let slotsFound = 0
    let daysSearched = 0
    const maxDaysToSearch = 14 // Limit search to 14 days in the future
    const maxEndTime = 22 // Studio closes at 22:00

    // Create a list of all unavailable periods (bookings and holidays)
    const unavailablePeriods = [
      ...futureBookings.map((booking) => ({
        start: new Date(booking.start),
        end: new Date(booking.end),
      })),
      ...holidays.map((holiday) => ({
        start: new Date(holiday.start),
        end: new Date(holiday.end),
      })),
    ]

    // Sort unavailable periods by start time
    unavailablePeriods.sort((a, b) => a.start.getTime() - b.start.getTime())

    // Map day numbers to day names
    const dayMap: Record<number, string> = {
      0: "sun",
      1: "mon",
      2: "tue",
      3: "wed",
      4: "thu",
      5: "fri",
      6: "sat",
    }

    // Start searching from the requested start time (to find closest slots)
    let currentDate = new Date(requestedStart)
    let currentDay = currentDate.getDate()

    while (slotsFound < 2 && daysSearched < maxDaysToSearch) {
      // If we've moved to a new day, reset to operating start hour
      if (currentDate.getDate() !== currentDay) {
        currentDay = currentDate.getDate()
        currentDate.setHours(operatingStartHour, 0, 0, 0)
        daysSearched++
      }

      // Get the day of the week for the current date
      const dayOfWeek = currentDate.getDay()
      const dayName = dayMap[dayOfWeek].toLowerCase()

      // Get engineer's availability for this day of the week
      const dayAvailability = weeklyAvailability.filter((a) => a.day.toLowerCase() === dayName)

      // If engineer has no availability for this day, move to next day
      if (dayAvailability.length === 0) {
        currentDate.setDate(currentDate.getDate() + 1)
        currentDate.setHours(operatingStartHour, 0, 0, 0)
        daysSearched++
        continue
      }

      // Check each availability slot for this day
      let foundSlotForToday = false

      for (const slot of dayAvailability) {
        if (foundSlotForToday) break

        // Parse start and end times from availability
        const [startHour, startMinute] = slot.start.split(":").map(Number)
        const [endHour, endMinute] = slot.end.split(":").map(Number)

        // Create date objects for this availability slot
        let availabilityStart = new Date(currentDate)
        availabilityStart.setHours(startHour, startMinute, 0, 0)

        const availabilityEnd = new Date(currentDate)
        availabilityEnd.setHours(endHour, endMinute, 0, 0)

        // Handle times that cross midnight
        if (availabilityEnd < availabilityStart) {
          availabilityEnd.setDate(availabilityEnd.getDate() + 1)
        }

        // If current time is after the end of this availability slot, skip to next slot
        if (currentDate > availabilityEnd) {
          continue
        }

        // If current time is within this availability slot, adjust start time
        if (currentDate > availabilityStart) {
          availabilityStart = new Date(currentDate)
        }

        // Try to find a free slot within this availability period
        const slotStart = new Date(availabilityStart)

        while (slotStart.getTime() + durationMinutes * 60 * 1000 <= availabilityEnd.getTime()) {
          const slotEnd = new Date(slotStart.getTime() + durationMinutes * 60 * 1000)

          // Check if slot ends after max end time (22:00)
          if (slotEnd.getHours() > maxEndTime || (slotEnd.getHours() === maxEndTime && slotEnd.getMinutes() > 0)) {
            // Move to next day
            break
          }

          // Check if this potential slot overlaps with any unavailable period
          const isUnavailable = unavailablePeriods.some((period) =>
            isOverlapping(slotStart, slotEnd, period.start, period.end),
          )

          if (!isUnavailable) {
            // Found an available slot!
            alternativeSlots.push({
              start: format(slotStart, "yyyy-MM-dd'T'HH:mm:ss"),
              end: format(slotEnd, "yyyy-MM-dd'T'HH:mm:ss"),
            })

            slotsFound++
            foundSlotForToday = true

            // Move past this slot to look for the next one
            currentDate = new Date(slotEnd)
            break
          }

          // Try the next possible start time (increment by 30 minutes)
          slotStart.setMinutes(slotStart.getMinutes() + 30)
        }
      }

      // If we didn't find a slot today, move to the next day
      if (!foundSlotForToday) {
        currentDate.setDate(currentDate.getDate() + 1)
        currentDate.setHours(operatingStartHour, 0, 0, 0)
        daysSearched++
      }
    }

    return alternativeSlots
  }
  

}


// Helper function to check if two time intervals overlap
function isOverlapping(start1: Date, end1: Date, start2: Date, end2: Date): boolean {
  return start1 < end2 && start2 < end1
}

