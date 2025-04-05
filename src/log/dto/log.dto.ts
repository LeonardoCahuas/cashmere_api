import { IsString, IsEnum, IsDate, IsOptional } from "class-validator"
import { LogAction } from "@prisma/client"

export class CreateLogDto {
  @IsEnum(LogAction)
  action: LogAction

  @IsString()
  userId: string

  @IsString()
  @IsOptional()
  bookingId?: string

  @IsOptional()
  oldBooking?: any

  @IsOptional()
  newBooking?: any
} 