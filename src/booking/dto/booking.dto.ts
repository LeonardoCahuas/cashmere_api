import { IsString, IsDate, IsArray, IsOptional, IsEnum } from "class-validator"
import { Type } from "class-transformer"
import { BookingState } from "@prisma/client"

export class CreateBookingDto {
  @IsString()
  @IsOptional()
  userId: string

  @IsString()
  fonicoId: string

  @IsString()
  studioId: string

  @Type(() => Date)
  @IsDate()
  start: Date

  @Type(() => Date)
  @IsDate()
  end: Date

  @IsArray()
  @IsString({ each: true })
  services: string[]

  @IsString()
  @IsOptional()
  notes?: string
  
  @IsEnum(BookingState)
  @IsOptional()
  state?: BookingState

  @IsString()
  phone: string

  @IsString()
  instagram: string

  @IsString()
  booked_by: string
}


export class UpdateBookingDto {
  @IsString()
  @IsOptional()
  fonicoId?: string

  @IsString()
  @IsOptional()
  studioId?: string

  @Type(() => Date)
  @IsDate()
  @IsOptional()
  start?: Date

  @Type(() => Date)
  @IsDate()
  @IsOptional()
  end?: Date

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  services?: string[]

  @IsString()
  @IsOptional()
  notes?: string

  @IsEnum(BookingState)
  @IsOptional()
  state?: BookingState
}

export class UpdateBookingStateDto {
  @IsEnum(BookingState)
  state: BookingState
}

export interface BookingStatsResponse {
  totalBookings: number
  totalRevenue: number
  bookingsByFonico: Array<{
    fonicoId: string
    fonicoName: string
    bookingsCount: number
    revenue: number
  }>
  bookingsByStudio: Array<{
    studioId: string
    bookingsCount: number
    revenue: number
  }>
  averageBookingDuration: number
}

export interface BookingFilters {
  userId?: string
  fonicoId?: string
  studioId?: string
  state?: BookingState
  start?: {
    gte?: Date
    lte?: Date
  }
  end?: {
    gte?: Date
    lte?: Date
  }
  services?: {
    some: {
      id: {
        in: string[]
      }
    }
  }
  user?: {
    entityId?: string
  }
}
