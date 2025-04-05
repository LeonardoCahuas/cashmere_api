import { startOfWeek, endOfWeek, eachDayOfInterval, format, parse, isWithinInterval, parseISO } from "date-fns"
import { it } from "date-fns/locale"

export class DateUtils {
  /**
   * Gets an array of days for a week containing the given date
   * @param date The reference date
   * @returns Array of day objects with date, dayName, and formatted string
   */
  static getWeekDays(dat: Date) {
    const date = parseISO(dat.toString())
    const start = startOfWeek(date, { locale: it })
    const end = endOfWeek(date, { locale: it })
    console.log(start)
    console.log(end)
    return eachDayOfInterval({ start, end }).map((day) => ({
      date: day,
      dayName: format(day, "EEE").toLowerCase(), // Using lowercase 3-letter day codes (mon, tue, etc.)
      formatted: format(day, "yyyy-MM-dd"),
    }))
  }

  /**
   * Checks if a time is within a given range
   * @param time The time to check
   * @param start The start of the range
   * @param end The end of the range
   * @returns Boolean indicating if time is within range
   */
  static isTimeInRange(time: Date, start: Date, end: Date): boolean {
    return isWithinInterval(time, { start, end })
  }

  /**
   * Parses a time string (HH:mm) into a Date object
   * @param timeString Time string in HH:mm format
   * @returns Date object
   */
  static parseTime(timeString: string): Date {
    return parse(timeString, "HH:mm", new Date())
  }

  /**
   * Formats a Date object to a time string (HH:mm)
   * @param date Date object
   * @returns Time string in HH:mm format
   */
  static formatTime(date: Date): string {
    return format(date, "HH:mm")
  }

  /**
   * Converts a time string to minutes since midnight
   * @param timeString Time string in HH:mm format
   * @returns Number of minutes since midnight
   */
  static timeStringToMinutes(timeString: string): number {
    const [hours, minutes] = timeString.split(":").map(Number)
    return hours * 60 + minutes
  }

  /**
   * Converts minutes since midnight to a time string (HH:mm)
   * @param minutes Number of minutes since midnight
   * @returns Time string in HH:mm format
   */
  static minutesToTimeString(minutes: number): string {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}`
  }

  /**
   * Checks if a requested time slot is available
   * @param requestedStart Start time of requested slot
   * @param requestedEnd End time of requested slot
   * @param availabilities Array of available time slots
   * @param bookings Array of booked time slots
   * @returns Boolean indicating if the requested slot is available
   */
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

  // Modifica il metodo areRangesOverlappingOrAdjacent per gestire meglio gli intervalli che attraversano la mezzanotte
  static areRangesOverlappingOrAdjacent(
    range1Start: number,
    range1End: number,
    range2Start: number,
    range2End: number,
  ): boolean {
    // Gestisci il caso in cui gli intervalli attraversano la mezzanotte
    const adjustedRange1End = range1End < range1Start ? range1End + 24 * 60 : range1End
    const adjustedRange2End = range2End < range2Start ? range2End + 24 * 60 : range2End

    // Ranges overlap if one starts before the other ends
    const overlap = range1Start <= adjustedRange2End && range2Start <= adjustedRange1End

    // Ranges are adjacent if one ends exactly when the other starts
    const adjacent = adjustedRange1End === range2Start || adjustedRange2End === range1Start

    return overlap || adjacent
  }

  // Modifica il metodo mergeTimeRanges per gestire meglio gli intervalli che attraversano la mezzanotte
  static mergeTimeRanges(
    ranges: Array<{ start: number; end: number; id: string }>,
  ): Array<{ start: number; end: number; ids: string[] }> {
    if (ranges.length === 0) return []

    // Normalizza gli intervalli che attraversano la mezzanotte
    const normalizedRanges = ranges.map((range) => {
      const adjustedEnd = range.end < range.start ? range.end + 24 * 60 : range.end
      return { ...range, adjustedEnd }
    })

    // Sort ranges by start time
    const sortedRanges = [...normalizedRanges].sort((a, b) => a.start - b.start)

    const mergedRanges: Array<{ start: number; end: number; ids: string[] }> = []
    let currentRange = {
      start: sortedRanges[0].start,
      end: sortedRanges[0].adjustedEnd,
      ids: [sortedRanges[0].id],
    }

    for (let i = 1; i < sortedRanges.length; i++) {
      const current = sortedRanges[i]

      // If current range overlaps or is adjacent to the previous range
      if (
        this.areRangesOverlappingOrAdjacent(currentRange.start, currentRange.end, current.start, current.adjustedEnd)
      ) {
        // Extend the current range if needed
        currentRange.end = Math.max(currentRange.end, current.adjustedEnd)
        currentRange.ids.push(current.id)
      } else {
        // Start a new range
        mergedRanges.push(currentRange)
        currentRange = {
          start: current.start,
          end: current.adjustedEnd,
          ids: [current.id],
        }
      }
    }

    // Add the last range
    mergedRanges.push(currentRange)

    // Normalizza gli orari di fine per riportarli nel formato 0-24 ore
    return mergedRanges.map((range) => ({
      start: range.start,
      end: range.end > 24 * 60 ? range.end % (24 * 60) : range.end,
      ids: range.ids,
    }))
  }
}

