import { startOfWeek, endOfWeek, eachDayOfInterval, format, parse, isWithinInterval } from "date-fns"
import { it } from "date-fns/locale"

export class DateUtils {
  static getWeekDays(date: Date) {
    const start = startOfWeek(date, { locale: it })
    const end = endOfWeek(date, { locale: it })

    return eachDayOfInterval({ start, end }).map((day) => ({
      date: day,
      dayName: format(day, "EEEE", { locale: it }),
      formatted: format(day, "yyyy-MM-dd"),
    }))
  }

  static isTimeInRange(time: Date, start: Date, end: Date): boolean {
    return isWithinInterval(time, { start, end })
  }

  static parseTime(timeString: string): Date {
    return parse(timeString, "HH:mm", new Date())
  }

  static formatTime(date: Date): string {
    return format(date, "HH:mm")
  }

  static checkAvailability(
    requestedStart: Date,
    requestedEnd: Date,
    availabilities: Array<{ start: Date; end: Date }>,
    bookings: Array<{ start: Date; end: Date }>,
  ): boolean {
    // Check if time is within any availability
    const isWithinAvailability = availabilities.some(
      (availability) =>
        this.isTimeInRange(requestedStart, availability.start, availability.end) &&
        this.isTimeInRange(requestedEnd, availability.start, availability.end),
    )

    if (!isWithinAvailability) return false

    // Check if time overlaps with any booking
    const hasOverlappingBooking = bookings.some(
      (booking) => requestedStart < booking.end && requestedEnd > booking.start,
    )

    return !hasOverlappingBooking
  }
}

