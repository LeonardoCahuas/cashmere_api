import { Injectable, BadRequestException, NotFoundException } from "@nestjs/common"
import { PrismaService } from "../prisma/prisma.service"
import type { CreateBookingDto, UpdateBookingDto, BookingStatsResponse, BookingFilters } from "./dto/booking.dto"
import { BookingFilters as BookingFilterUtil } from "../utils/booking-filter.util"
import { type Booking, Role, type User, type Log, BookingState, HolidayState } from "@prisma/client"
import { StateType } from "utils/types"
import { addDays, format, isWithinInterval, setHours, setMinutes, startOfDay } from "date-fns"

const ITALIAN_TIMEZONE_OFFSET = 2;

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

  async findFonicoFutureBookingsWithAvailabilityCheck(fonicoId: string): Promise<(Booking & { isWithinAvailability: boolean })[]> {
    const now = new Date();

    // Ottieni tutte le prenotazioni future del fonico
    const futureBookings = await this.prisma.booking.findMany({
      where: {
        fonicoId,
        start: {
          gte: now,
        },
        state: BookingState.CONFERMATO,
      },
      orderBy: {
        start: 'asc',
      },
      include: {
        services: true,
        studio: true,
        user: true,
      },
    });

    // Ottieni tutte le disponibilità settimanali del fonico
    const weeklyAvailability = await this.prisma.availability.findMany({
      where: {
        userId: fonicoId,
      },
    });

    // Map day numbers to day names
    const dayMap: Record<number, string> = {
      0: "sun",
      1: "mon",
      2: "tue",
      3: "wed",
      4: "thu",
      5: "fri",
      6: "sat",
    };

    // Controlla se ogni prenotazione è all'interno della disponibilità del fonico
    const bookingsWithAvailabilityCheck = futureBookings.map(booking => {
      const bookingStart = new Date(booking.start);
      const bookingEnd = new Date(booking.end);

      // Determina il giorno della settimana della prenotazione in UTC
      const dayOfWeek = bookingStart.getUTCDay();
      const dayName = dayMap[dayOfWeek].toLowerCase();

      // Filtra le disponibilità per questo giorno della settimana
      const dayAvailability = weeklyAvailability.filter(a => a.day.toLowerCase() === dayName);

      // Se non ci sono disponibilità per questo giorno, la prenotazione è fuori dagli orari
      if (dayAvailability.length === 0) {
        return { ...booking, isWithinAvailability: false };
      }

      // Controlla se la prenotazione è all'interno di uno degli slot di disponibilità
      let isWithinAvailability = false;

      for (const slot of dayAvailability) {
        // Parsing degli orari di inizio e fine della disponibilità (in orario italiano)
        const [startHour, startMinute] = slot.start.split(':').map(Number);
        const [endHour, endMinute] = slot.end.split(':').map(Number);

        // Converti in UTC sottraendo l'offset del fuso orario italiano
        let slotStartHour = startHour - ITALIAN_TIMEZONE_OFFSET;
        let slotEndHour = endHour - ITALIAN_TIMEZONE_OFFSET;

        // Gestisci il cambio di giorno nella conversione UTC
        if (slotStartHour < 0) slotStartHour += 24;
        if (slotEndHour < 0) slotEndHour += 24;

        // Crea gli oggetti Date per lo slot di disponibilità
        const slotStartDate = new Date(bookingStart);
        slotStartDate.setUTCHours(slotStartHour, startMinute, 0, 0);

        const slotEndDate = new Date(bookingStart);
        slotEndDate.setUTCHours(slotEndHour, endMinute, 0, 0);

        // Gestisci gli orari che attraversano la mezzanotte
        if (slotEndDate < slotStartDate) {
          slotEndDate.setUTCDate(slotEndDate.getUTCDate() + 1);
        }

        // Controlla se la prenotazione è completamente all'interno dello slot di disponibilità
        if (bookingStart >= slotStartDate && bookingEnd <= slotEndDate) {
          isWithinAvailability = true;
          break;
        }
      }

      return { ...booking, isWithinAvailability };
    });

    return bookingsWithAvailabilityCheck;
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
    console.log("id del fonico: ", fonicoId)
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
        OR: [
          { userId: userId },
          { user: { managerId: userId } }
        ],
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
    const operatingEndHour = 22

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
        // Subtract 2 hours from availabilityStart
        availabilityStart.setHours(availabilityStart.getHours() - ITALIAN_TIMEZONE_OFFSET)

        const availabilityEnd = new Date(start)
        availabilityEnd.setHours(endHour, endMinute, 0, 0)
        // Subtract 2 hours from availabilityEnd
        availabilityEnd.setHours(availabilityEnd.getHours() - ITALIAN_TIMEZONE_OFFSET)

        // Handle times that cross midnight for both original and adjusted times
        if (endHour < startHour || (endHour === startHour && endMinute < startMinute)) {
          // The original slot crosses midnight
          availabilityEnd.setDate(availabilityEnd.getDate() + 1)
        }

        // Handle potential day change caused by the 2-hour subtraction
        if (availabilityStart.getDate() !== start.getDate()) {
          // If subtracting 2 hours pushed the start to the previous day
          availabilityStart.setDate(start.getDate())
        }

        if (
          availabilityEnd.getDate() !== start.getDate() &&
          !(endHour < startHour || (endHour === startHour && endMinute < startMinute))
        ) {
          // If subtracting 2 hours pushed the end to the previous day
          // and it's not due to the original slot crossing midnight
          availabilityEnd.setDate(start.getDate())
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

  async findToConfirm(): Promise<BookingWithRelations[]> {


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

    /* const fonicoBookings = await this.prisma.booking.findMany({
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
    }) */

    const fonicoBookings = fonicoId === 'cm8z06fn00002mytvfftqrkgx' ? [] : await this.prisma.booking.findMany({
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
    const utcRequestedStart = new Date(requestedStart);

    const futureBookings = await this.prisma.booking.findMany({
      where: {
        studioId,
        state: BookingState.CONFERMATO,
        start: {
          gte: new Date(new Date(utcRequestedStart).setUTCHours(0, 0, 0, 0)),
        },
      },
      orderBy: {
        start: "asc",
      },
      select: {
        start: true,
        end: true,
      },
    });

    const alternativeSlots: { start: string; end: string }[] = [];
    let slotsFound = 0;
    let daysSearched = 0;
    const maxDaysToSearch = 14;
    const maxEndTime = 22

    // Studio apre alle 10:00 e chiude alle 22:00 ORA ITALIANA
    const utcOperatingStartHour = operatingStartHour - ITALIAN_TIMEZONE_OFFSET;
    const utcOperatingEndHour = operatingEndHour - ITALIAN_TIMEZONE_OFFSET;

    const bookedPeriods = futureBookings.map((booking) => ({
      start: new Date(booking.start),
      end: new Date(booking.end),
    }));

    bookedPeriods.sort((a, b) => a.start.getTime() - b.start.getTime());

    let currentDate = new Date(utcRequestedStart);
    let currentDay = currentDate.getUTCDate();

    while (slotsFound < 2 && daysSearched < maxDaysToSearch) {
      if (currentDate.getUTCDate() !== currentDay) {
        currentDay = currentDate.getUTCDate();
        currentDate.setUTCHours(utcOperatingStartHour, 0, 0, 0);
        daysSearched++;
      }

      if (currentDate.getUTCHours() < utcOperatingStartHour) {
        currentDate.setUTCHours(utcOperatingStartHour, 0, 0, 0);
      }

      const potentialEndTime = new Date(currentDate.getTime() + durationMinutes * 60 * 1000);
      const potentialStartTime = new Date(currentDate.getTime());
      // Critical fix: Check if end time exceeds operating hours (22:00 Italian time)
      // We need to convert the UTC time to Italian time for this check
      const italianEndHour = (potentialEndTime.getUTCHours() + ITALIAN_TIMEZONE_OFFSET) % 24;
      const goesAfterHours = potentialEndTime.getUTCHours() > (maxEndTime - ITALIAN_TIMEZONE_OFFSET) ||
        (potentialEndTime.getUTCHours() === (maxEndTime - ITALIAN_TIMEZONE_OFFSET) && potentialEndTime.getUTCMinutes() > 0) || potentialStartTime.getUTCHours() >= maxEndTime + ITALIAN_TIMEZONE_OFFSET || potentialEndTime.getUTCHours() < 11

      if (goesAfterHours) {
        // Move to next day
        currentDate.setUTCDate(currentDate.getUTCDate() + 1);
        currentDate.setUTCHours(utcOperatingStartHour, 0, 0, 0);
        daysSearched++;
        continue;
      }

      const overlappingBooking = bookedPeriods.find((period) =>
        isOverlapping(currentDate, potentialEndTime, period.start, period.end),
      );

      if (!overlappingBooking) {
        // Format dates for output, applying the timezone offset
        const italianStart = new Date(currentDate.getTime() + ITALIAN_TIMEZONE_OFFSET * 60 * 60 * 1000);
        const italianEnd = new Date(potentialEndTime.getTime() + ITALIAN_TIMEZONE_OFFSET * 60 * 60 * 1000);

        alternativeSlots.push({
          start: italianStart.toISOString().replace('Z', ''),
          end: italianEnd.toISOString().replace('Z', ''),
        });

        slotsFound++;
        currentDate = new Date(potentialEndTime);
      } else {
        currentDate = new Date(overlappingBooking.end);
      }
    }

    return alternativeSlots;
  }

  private async findNextAvailableEngineerSlotsWithStudios(
    engineerId: string,
    requestedStart: Date,
    requestedEnd: Date,
    durationMinutes: number,
    operatingStartHour: number,
    operatingEndHour: number,
    studios: { id: string; value: any }[],
  ): Promise<{ start: string; end: string; availableStudios: string[] }[]> {
    console.log("=== INIZIO findNextAvailableEngineerSlotsWithStudios ===")
    console.log(`engineerId: ${engineerId}`)
    console.log(`requestedStart: ${requestedStart}`)
    console.log(`requestedEnd: ${requestedEnd}`)
    console.log(`durationMinutes: ${durationMinutes}`)
    console.log(`operatingStartHour: ${operatingStartHour}`)
    console.log(`operatingEndHour: ${operatingEndHour}`)
    console.log(`ITALIAN_TIMEZONE_OFFSET: ${ITALIAN_TIMEZONE_OFFSET}`)

    // Convert input dates to consistent UTC format
    const utcRequestedStart = new Date(requestedStart)
    const utcRequestedEnd = new Date(requestedEnd)
    console.log(`utcRequestedStart: ${utcRequestedStart}`)
    console.log(`utcRequestedEnd: ${utcRequestedEnd}`)

    const maxEndTime = 22 // Studio closes at 22:00 Italian time
    console.log(`maxEndTime (Italian): ${maxEndTime}:00`)

    // Convert operating hours to UTC by subtracting timezone offset
    const utcOperatingStartHour = operatingStartHour - ITALIAN_TIMEZONE_OFFSET
    const utcOperatingEndHour = operatingEndHour - ITALIAN_TIMEZONE_OFFSET
    const utcMaxEndTime = maxEndTime - ITALIAN_TIMEZONE_OFFSET

    console.log(`utcOperatingStartHour: ${utcOperatingStartHour}`)
    console.log(`utcOperatingEndHour: ${utcOperatingEndHour}`)
    console.log(`utcMaxEndTime: ${utcMaxEndTime}`)

    console.log("Fetching bookings for engineer...")
    // Get all future bookings for this engineer starting from the beginning of the requested day
    const futureBookings = await this.prisma.booking.findMany({
      where: {
        fonicoId: engineerId,
        state: BookingState.CONFERMATO,
        start: {
          gte: new Date(new Date(utcRequestedStart).setUTCHours(0, 0, 0, 0)),
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
    console.log(`Found ${futureBookings.length} future bookings for engineer`)
    futureBookings.forEach((booking, index) => {
      console.log(`Booking ${index + 1}: ${booking.start} - ${booking.end}`)
    })

    console.log("Fetching holidays for engineer...")
    // Get all holidays for this engineer
    const holidays = await this.prisma.holiday.findMany({
      where: {
        userId: engineerId,
        state: HolidayState.CONFERMATO,
        end: {
          gte: new Date(new Date(utcRequestedStart).setUTCHours(0, 0, 0, 0)),
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
    console.log(`Found ${holidays.length} holidays for engineer`)
    holidays.forEach((holiday, index) => {
      console.log(`Holiday ${index + 1}: ${holiday.start} - ${holiday.end}`)
    })

    console.log("Fetching weekly availability for engineer...")
    // Get engineer's weekly availability
    const weeklyAvailability = await this.prisma.availability.findMany({
      where: {
        userId: engineerId,
      },
    })
    console.log(`Found ${weeklyAvailability.length} availability entries for engineer`)
    weeklyAvailability.forEach((avail, index) => {
      console.log(`Availability ${index + 1}: Day=${avail.day}, ${avail.start} - ${avail.end}`)
    })

    const alternativeSlots: { start: string; end: string; availableStudios: string[] }[] = []
    let slotsFound = 0
    let daysSearched = 0
    const maxDaysToSearch = 14 // Limit search to 14 days in the future
    console.log(`maxDaysToSearch: ${maxDaysToSearch}`)

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
    console.log(`Total unavailable periods: ${unavailablePeriods.length}`)

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
    let currentDate = new Date(utcRequestedStart)
    const currentEnd = new Date(utcRequestedEnd)
    let currentDay = currentDate.getUTCDate()
    console.log(`Initial currentDate: ${currentDate}`)
    console.log(`Initial currentDay: ${currentDay}`)

    while (slotsFound < 2 && daysSearched < maxDaysToSearch) {
      console.log(`\n=== SEARCH ITERATION (slotsFound: ${slotsFound}, daysSearched: ${daysSearched}) ===`)
      console.log(`Current date: ${currentDate}`)
      console.log(`Current UTC date: ${currentDate.getUTCDate()}`)
      console.log(`Current UTC hours: ${currentDate.getUTCHours()}:${currentDate.getUTCMinutes()}`)

      // If we've moved to a new day, reset to operating start hour
      if (currentDate.getUTCDate() !== currentDay) {
        console.log("Moving to a new day...")
        currentDay = currentDate.getUTCDate()
        currentDate.setUTCHours(utcOperatingStartHour, 0, 0, 0)
        daysSearched++
        console.log(`New day: ${currentDate}, daysSearched: ${daysSearched}`)
      }

      // If current time is before operating hours, adjust to opening time
      if (currentDate.getUTCHours() < utcOperatingStartHour) {
        console.log("Current time is before operating hours, adjusting...")
        currentDate.setUTCHours(utcOperatingStartHour, 0, 0, 0)
        console.log(`Adjusted to opening time: ${currentDate}`)
      }

      // Get the day of the week for the current date (UTC-aware)
      const dayOfWeek = currentDate.getUTCDay()
      const dayName = dayMap[dayOfWeek].toLowerCase()
      console.log(`Day of week: ${dayOfWeek} (${dayName})`)

      // Get engineer's availability for this day of the week
      const dayAvailability = weeklyAvailability.filter((a) => a.day.toLowerCase() === dayName)
      console.log(`Availability entries for ${dayName}: ${dayAvailability.length}`)

      if (dayAvailability.length === 0) {
        console.log(`No availability for ${dayName}, moving to next day`)
      }

      // If engineer has no availability for this day, move to next day
      if (dayAvailability.length === 0) {
        currentDate.setUTCDate(currentDate.getUTCDate() + 1)
        currentDate.setUTCHours(utcOperatingStartHour, 0, 0, 0)
        daysSearched++
        console.log(`Moved to next day: ${currentDate}, daysSearched: ${daysSearched}`)
        continue
      }

      // Check each availability slot for this day
      let foundSlotForToday = false

      for (let availIdx = 0; availIdx < dayAvailability.length; availIdx++) {
        const slot = dayAvailability[availIdx]
        console.log(`\n--- Checking availability slot ${availIdx + 1}: ${slot.start} - ${slot.end} ---`)

        if (foundSlotForToday) {
          console.log("Already found slot for today, skipping remaining availability checks")
          break
        }

        // Parse start and end times from availability (these are in Italian time)
        const [startHour, startMinute] = slot.start.split(":").map(Number)
        const [endHour, endMinute] = slot.end.split(":").map(Number)
        console.log(`Italian time availability: ${startHour}:${startMinute} - ${endHour}:${endMinute}`)

        // Convert to UTC by subtracting the timezone offset
        let slotStartHour = startHour - ITALIAN_TIMEZONE_OFFSET
        let slotEndHour = endHour - ITALIAN_TIMEZONE_OFFSET

        // Handle day wrap for UTC conversion
        if (slotStartHour < 0) slotStartHour += 24
        if (slotEndHour < 0) slotEndHour += 24

        console.log(`UTC time availability: ${slotStartHour}:${startMinute} - ${slotEndHour}:${endMinute}`)

        // Create date objects for this availability slot (UTC-aware)
        let availabilityStart = new Date(currentDate)
        availabilityStart.setUTCHours(slotStartHour, startMinute, 0, 0)

        const availabilityEnd = new Date(currentDate)
        availabilityEnd.setUTCHours(slotEndHour, endMinute, 0, 0)

        console.log(`Availability start: ${availabilityStart}`)
        console.log(`Availability end: ${availabilityEnd}`)

        // Handle times that cross midnight
        if (availabilityEnd < availabilityStart) {
          console.log("Availability crosses midnight, adjusting end date...")
          availabilityEnd.setUTCDate(availabilityEnd.getUTCDate() + 1)
          console.log(`Adjusted availability end: ${availabilityEnd}`)
        }

        // If current time is after the end of this availability slot, skip to next slot
        if (currentDate > availabilityEnd) {
          console.log("Current time is after availability end, skipping slot")
          continue
        }

        // If current time is within this availability slot, adjust start time
        if (currentDate > availabilityStart) {
          console.log("Current time is within availability slot, adjusting start time")
          availabilityStart = new Date(currentDate)
          console.log(`Adjusted availability start: ${availabilityStart}`)
        }

        // Try to find a free slot within this availability period
        const slotStart = new Date(availabilityStart)
        console.log(`Looking for free slots starting at: ${slotStart}`)

        let attemptCount = 0
        while (slotStart.getTime() + durationMinutes * 60 * 1000 <= availabilityEnd.getTime()) {
          attemptCount++
          console.log(`\nAttempt ${attemptCount} at time: ${slotStart}`)

          // Add this check - If start time is already at or past max end time in Italian time
          const slotStartItalianHour = (slotStart.getUTCHours() + ITALIAN_TIMEZONE_OFFSET) % 24
          const slotStartItalianMinute = slotStart.getUTCMinutes()

          console.log(`Slot start Italian time: ${slotStartItalianHour}:${slotStartItalianMinute}`)

          // Check if slot starts at or after max end time (22:00 Italian time)
          const startsAfterHours = slotStartItalianHour >= maxEndTime

          console.log(`Starts after hours? ${startsAfterHours}`)

          if (startsAfterHours) {
            console.log("Start time is already at or past closing time, breaking loop")
            break // Skip this slot as it starts after closing time
          }

          const slotEnd = new Date(slotStart.getTime() + durationMinutes * 60 * 1000)
          console.log(`Potential slot end: ${slotEnd}`)

          // Check if slot end time would exceed the max end time (22:00 Italian time)
          const slotEndItalianHour = (slotEnd.getUTCHours() + ITALIAN_TIMEZONE_OFFSET) % 24
          const slotEndItalianMinute = slotEnd.getUTCMinutes()

          console.log(`Slot end Italian time: ${slotEndItalianHour}:${slotEndItalianMinute}`)
          console.log(`Max Italian end time: ${maxEndTime}:00`)

          // Check if slot ends after max end time (22:00 Italian time)
          const goesAfterHours =
            slotEndItalianHour > maxEndTime ||
            (slotEndItalianHour === maxEndTime && slotEndItalianMinute > 0) ||
            slotEndItalianHour < operatingStartHour ||
            slotStartItalianHour < operatingStartHour

          console.log(`Goes after hours? ${goesAfterHours}`)

          if (goesAfterHours) {
            console.log("Slot would end after closing time, breaking loop")
            break // Move to next day or slot
          }

          // Check if this potential slot overlaps with any unavailable period
          let isUnavailable = false
          for (let i = 0; i < unavailablePeriods.length; i++) {
            const period = unavailablePeriods[i]
            const overlaps = isOverlapping(slotStart, slotEnd, period.start, period.end)
            if (overlaps) {
              console.log(`Overlaps with unavailable period ${i + 1}: ${period.start} - ${period.end}`)
              isUnavailable = true
              break
            }
          }

          console.log(`Is unavailable due to bookings/holidays? ${isUnavailable}`)

          if (!isUnavailable) {
            console.log("Slot is available, checking for available studios...")
            // Check which studios are available during this slot
            const availableStudios = await this.findAvailableStudiosForSlot(slotStart, slotEnd, studios)
            console.log(`Available studios: ${availableStudios.length}`)

            if (availableStudios.length > 0) {
              console.log("Studios are available! Adding slot to results")

              // Found an available slot with available studios!
              // Convert times to proper format for output
              const formattedStart = format(slotStart, "yyyy-MM-dd'T'HH:mm:ss")
              const formattedEnd = format(slotEnd, "yyyy-MM-dd'T'HH:mm:ss")

              console.log(`Formatted slot: ${formattedStart} - ${formattedEnd}`)

              alternativeSlots.push({
                start: formattedStart,
                end: formattedEnd,
                availableStudios: availableStudios,
              })

              slotsFound++
              foundSlotForToday = true
              console.log(`Slots found: ${slotsFound}`)

              // Move past this slot to look for the next one
              currentDate = new Date(slotEnd)
              console.log(`Updated currentDate to: ${currentDate}`)
              break
            } else {
              console.log("No studios available for this time slot")
            }
          }

          // Try the next possible start time (increment by 30 minutes)
          slotStart.setUTCMinutes(slotStart.getUTCMinutes() + 30)
          console.log(`Moving to next slot time: ${slotStart}`)
        }

        console.log(`End of availability slot processing. Found slot for today? ${foundSlotForToday}`)
      }

      // If we didn't find a slot today, move to the next day
      if (!foundSlotForToday) {
        console.log("Did not find any slots today, moving to next day")
        currentDate.setUTCDate(currentDate.getUTCDate() + 1)
        currentDate.setUTCHours(utcOperatingStartHour, 0, 0, 0)
        daysSearched++
        console.log(`New date: ${currentDate}, daysSearched: ${daysSearched}`)
      }
    }

    console.log(`=== SEARCH COMPLETED ===`)
    console.log(`Total slots found: ${alternativeSlots.length}`)
    alternativeSlots.forEach((slot, i) => {
      console.log(`Slot ${i + 1}: ${slot.start} - ${slot.end} (Studios: ${slot.availableStudios.length})`)
    })

    return alternativeSlots
  }

  private async findAvailableStudiosForSlot(
    start: Date,
    end: Date,
    studios: { id: string; value: any }[],
  ): Promise<string[]> {
    // Make sure start and end are in UTC format for consistency
    const utcStart = new Date(start)
    const utcEnd = new Date(end)

    const availableStudios: string[] = []

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
                gte: utcStart,
                lt: utcEnd,
              },
            },
            {
              // Booking ends during the requested time
              end: {
                gt: utcStart,
                lte: utcEnd,
              },
            },
            {
              // Booking completely encompasses the requested time
              start: {
                lte: utcStart,
              },
              end: {
                gte: utcEnd,
              },
            },
          ],
        },
      })

      // If no overlapping bookings, the studio is available
      if (overlappingBookings.length === 0) {
        availableStudios.push(studio.id)
      }
    }

    return availableStudios
  }

}


// Helper function to check if two time intervals overlap
function isOverlapping(start1: Date, end1: Date, start2: Date, end2: Date): boolean {
  return start1 < end2 && start2 < end1
}

