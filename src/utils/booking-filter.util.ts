import { 
    startOfDay, 
    endOfDay, 
    isWithinInterval, 
    areIntervalsOverlapping,
    parseISO,
    format 
  } from 'date-fns';
  import { Booking, Availability, Holiday } from '@prisma/client';
  
  export class BookingFilters {
    static isTimeSlotAvailable(
      start: Date,
      end: Date,
      bookings: Booking[],
      availabilities: Availability[],
      holidays: Holiday[],
    ): boolean {
      // Controlla sovrapposizioni con prenotazioni esistenti
      const hasBookingConflict = bookings.some(booking =>
        areIntervalsOverlapping(
          { start: booking.start, end: booking.end },
          { start, end }
        )
      );
  
      if (hasBookingConflict) return false;
  
      // Controlla se il periodo è in un giorno di ferie
      const isHoliday = holidays.some(holiday =>
        isWithinInterval(start, { start: holiday.start, end: holiday.end }) ||
        isWithinInterval(end, { start: holiday.start, end: holiday.end })
      );
  
      if (isHoliday) return false;
  
      // Controlla se il periodo è nelle disponibilità
      const dayOfWeek = format(start, 'EEEE').toLowerCase();
      const hasAvailability = availabilities.some(availability => {
        if (availability.day.toLowerCase() !== dayOfWeek) return false;
  
        const availStart = parseISO(availability.start.toISOString());
        const availEnd = parseISO(availability.end.toISOString());
  
        return isWithinInterval(start, { start: availStart, end: availEnd }) &&
               isWithinInterval(end, { start: availStart, end: availEnd });
      });
  
      return hasAvailability;
    }
  
    static createBookingFilters(query: any) {
      const filters: any = {};
  
      // Filtri base
      if (query.userId) filters.userId = query.userId;
      if (query.fonicoId) filters.fonicoId = query.fonicoId;
      if (query.studioId) filters.studioId = query.studioId;
      if (query.state) filters.state = query.state;
  
      // Filtri data
      if (query.date) {
        const date = new Date(query.date);
        filters.start = {
          gte: startOfDay(date),
          lte: endOfDay(date),
        };
      } else {
        if (query.startDate) {
          filters.start = {
            ...(filters.start || {}),
            gte: new Date(query.startDate),
          };
        }
        if (query.endDate) {
          filters.end = {
            ...(filters.end || {}),
            lte: new Date(query.endDate),
          };
        }
      }
  
      // Filtri servizi
      if (query.serviceIds) {
        filters.services = {
          some: {
            id: {
              in: Array.isArray(query.serviceIds) 
                ? query.serviceIds 
                : [query.serviceIds],
            },
          },
        };
      }
  
      // Filtri entity
      if (query.entityId) {
        filters.user = {
          entityId: query.entityId,
        };
      }
  
      return filters;
    }
  
    static async checkStudioAvailability(
      studioId: string,
      fonicoId: string,
      start: Date,
      end: Date,
      prisma: any,
      excludeBookingId?: string,
    ): Promise<boolean> {
      // Recupera prenotazioni esistenti
      const existingBookings = await prisma.booking.findMany({
        where: {
          AND: [
            { studioId },
            { fonicoId },
            { id: { not: excludeBookingId } },
            {
              OR: [
                {
                  AND: [
                    { start: { lte: start } },
                    { end: { gt: start } },
                  ],
                },
                {
                  AND: [
                    { start: { lt: end } },
                    { end: { gte: end } },
                  ],
                },
              ],
            },
          ],
        },
      });
  
      if (existingBookings.length > 0) return false;
  
      // Recupera disponibilità del fonico
      const fonicoAvailabilities = await prisma.availability.findMany({
        where: { userId: fonicoId },
      });
  
      // Recupera ferie del fonico
      const fonicoHolidays = await prisma.holiday.findMany({
        where: { userId: fonicoId },
      });
  
      return this.isTimeSlotAvailable(
        start,
        end,
        existingBookings,
        fonicoAvailabilities,
        fonicoHolidays,
      );
    }
  }
  