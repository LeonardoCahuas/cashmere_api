import { Module } from "@nestjs/common";
import { BookingController } from "./booking.controller";
import { BookingService } from "./booking.service";
import { PrismaModule } from "../prisma/prisma.module";
import { AuthModule } from "../auth/auth.module";
import { CommonModule } from "../common/common.module";

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    CommonModule,
  ],
  controllers: [BookingController],
  providers: [BookingService],
  exports: [BookingService],
})
export class BookingModule {}


/* 
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
  } */

