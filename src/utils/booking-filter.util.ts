import { startOfDay, endOfDay, isWithinInterval, areIntervalsOverlapping, format } from "date-fns"
import { it } from "date-fns/locale"
import type { Booking, Availability, Holiday } from "@prisma/client"

export class BookingFilters {
  /**
   * Checks if a time slot is available based on existing bookings, availabilities, and holidays
   * @param start Start time of the requested slot
   * @param end End time of the requested slot
   * @param bookings Array of existing bookings
   * @param availabilities Array of availability records
   * @param holidays Array of holiday records
   * @returns Boolean indicating if the time slot is available
   */
  static isTimeSlotAvailable(
    start: Date,
    end: Date,
    bookings: Booking[],
    availabilities: Availability[],
    holidays: Holiday[],
  ): boolean {
    // Check for conflicts with existing bookings
    const hasBookingConflict = bookings.some((booking) =>
      areIntervalsOverlapping({ start: booking.start, end: booking.end }, { start, end }),
    )

    if (hasBookingConflict) return false

    // Check if the period is during a holiday
    const isHoliday = holidays.some(
      (holiday) =>
        isWithinInterval(start, { start: holiday.start, end: holiday.end }) ||
        isWithinInterval(end, { start: holiday.start, end: holiday.end }),
    )

    if (isHoliday) return false

    // Check if the period is within availability hours
    const dayOfWeek = format(start, "EEE", { locale: it }).toLowerCase()

    const hasAvailability = availabilities.some((availability) => {
      if (availability.day.toLowerCase() !== dayOfWeek) return false

      // Convert availability times to Date objects for the same day as the booking
      const availabilityStart = this.createTimeFromString(start, availability.start.toString())
      const availabilityEnd = this.createTimeFromString(start, availability.end.toString())

      return (
        isWithinInterval(start, { start: availabilityStart, end: availabilityEnd }) &&
        isWithinInterval(end, { start: availabilityStart, end: availabilityEnd })
      )
    })

    return hasAvailability
  }

  /**
   * Creates a Date object with the date from baseDate and time from timeString
   * @param baseDate Date to use for year, month, day
   * @param timeString Time string in HH:mm format
   * @returns Date object with combined date and time
   */
  private static createTimeFromString(baseDate: Date, timeString: string): Date {
    const [hours, minutes] = timeString.split(":").map(Number)
    const result = new Date(baseDate)
    result.setHours(hours, minutes, 0, 0)
    return result
  }

  /**
   * Creates Prisma filters based on query parameters
   * @param query Query parameters object
   * @returns Prisma filter object
   */
  static createBookingFilters(query: any) {
    const filters: any = {}

    // Base filters
    if (query.userId) filters.userId = query.userId
    if (query.fonicoId) filters.fonicoId = query.fonicoId
    if (query.studioId) filters.studioId = query.studioId
    if (query.state) filters.state = query.state

    // Date filters
    if (query.date) {
      const date = new Date(query.date)
      filters.start = {
        gte: startOfDay(date),
        lte: endOfDay(date),
      }
    } else {
      if (query.startDate) {
        filters.start = {
          ...(filters.start || {}),
          gte: new Date(query.startDate),
        }
      }
      if (query.endDate) {
        filters.end = {
          ...(filters.end || {}),
          lte: new Date(query.endDate),
        }
      }
    }

    // Service filters
    if (query.serviceIds) {
      filters.services = {
        some: {
          id: {
            in: Array.isArray(query.serviceIds) ? query.serviceIds : [query.serviceIds],
          },
        },
      }
    }

    // Entity filters
    if (query.entityId) {
      filters.user = {
        entityId: query.entityId,
      }
    }

    return filters
  }

  /**
   * Checks if a studio is available for booking at the specified time
   * @param studioId ID of the studio
   * @param fonicoId ID of the audio engineer
   * @param start Start time of the requested booking
   * @param end End time of the requested booking
   * @param prisma Prisma client instance
   * @param excludeBookingId Optional booking ID to exclude from conflicts
   * @returns Promise resolving to boolean indicating if studio is available
   */
  static async checkStudioAvailability(
    studioId: string,
    fonicoId: string,
    start: Date,
    end: Date,
    prisma: any,
    excludeBookingId?: string,
  ): Promise<boolean> {
    // Get existing bookings
    const existingBookings = await prisma.booking.findMany({
      where: {
        AND: [
          { studioId },
          { fonicoId },
          { id: { not: excludeBookingId } },
          {
            OR: [
              {
                AND: [{ start: { lte: start } }, { end: { gt: start } }],
              },
              {
                AND: [{ start: { lt: end } }, { end: { gte: end } }],
              },
              {
                AND: [{ start: { gte: start } }, { end: { lte: end } }],
              },
            ],
          },
        ],
      },
    })

    if (existingBookings.length > 0) return false

    // Get audio engineer's availabilities
    const fonicoAvailabilities = await prisma.availability.findMany({
      where: { userId: fonicoId },
    })

    // Get audio engineer's holidays
    const fonicoHolidays = await prisma.holiday.findMany({
      where: { userId: fonicoId },
    })

    return this.isTimeSlotAvailable(start, end, existingBookings, fonicoAvailabilities, fonicoHolidays)
  }

  /**
   * Finds available time slots for a studio and audio engineer on a specific date
   * @param studioId ID of the studio
   * @param fonicoId ID of the audio engineer
   * @param date Date to check for availability
   * @param prisma Prisma client instance
   * @returns Promise resolving to array of available time slots
   */
  static async findAvailableTimeSlots(
    studioId: string,
    fonicoId: string,
    date: Date,
    prisma: any,
  ): Promise<Array<{ start: Date; end: Date }>> {
    const dayStart = startOfDay(date)
    const dayEnd = endOfDay(date)
    const dayOfWeek = format(date, "EEE", { locale: it }).toLowerCase()

    // Get existing bookings for that day
    const existingBookings = await prisma.booking.findMany({
      where: {
        AND: [{ studioId }, { fonicoId }, { start: { gte: dayStart } }, { end: { lte: dayEnd } }],
      },
    })

    // Get audio engineer's availabilities for that day of week
    const availabilities = await prisma.availability.findMany({
      where: {
        userId: fonicoId,
        day: dayOfWeek,
      },
    })

    // Get audio engineer's holidays
    const holidays = await prisma.holiday.findMany({
      where: {
        userId: fonicoId,
        start: { lte: dayEnd },
        end: { gte: dayStart },
      },
    })

    // If there are holidays covering the entire day, return no available slots
    const fullDayHoliday = holidays.some(
      (holiday: { start: any; end: any }) =>
        isWithinInterval(dayStart, { start: holiday.start, end: holiday.end }) &&
        isWithinInterval(dayEnd, { start: holiday.start, end: holiday.end }),
    )

    if (fullDayHoliday || availabilities.length === 0) {
      return []
    }

    // Convert availabilities to actual time slots for the specific date
    const availableSlots = availabilities.map((availability: { start: { toString: () => string }; end: { toString: () => string } }) => {
      const startTime = this.createTimeFromString(date, availability.start.toString())
      const endTime = this.createTimeFromString(date, availability.end.toString())
      return { start: startTime, end: endTime }
    })

    // Remove booked slots from available slots
    const finalAvailableSlots: Array<{ start: Date; end: Date }> = []

    for (const slot of availableSlots) {
      let currentSlot = { start: slot.start, end: slot.end }
      let slotAvailable = true

      // Check for conflicts with bookings
      for (const booking of existingBookings) {
        if (areIntervalsOverlapping(currentSlot, { start: booking.start, end: booking.end })) {
          // If booking starts after slot start, add the portion before booking
          if (booking.start > currentSlot.start) {
            finalAvailableSlots.push({
              start: currentSlot.start,
              end: booking.start,
            })
          }

          // Update current slot to start after the booking ends
          if (booking.end < currentSlot.end) {
            currentSlot = {
              start: booking.end,
              end: currentSlot.end,
            }
          } else {
            // Booking covers the rest of the slot
            slotAvailable = false
            break
          }
        }
      }

      // Add the remaining slot if it's still available
      if (slotAvailable && currentSlot.start < currentSlot.end) {
        finalAvailableSlots.push(currentSlot)
      }
    }

    return finalAvailableSlots
  }
}

