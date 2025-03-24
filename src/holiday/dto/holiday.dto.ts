import { IsString, IsDate, IsEnum, IsOptional } from "class-validator"
import { Type } from "class-transformer"
import { HolidayState, HolidayType } from "@prisma/client"

export class CreateHolidayDto {
  @Type(() => Date)
  @IsDate()
  start: Date

  @Type(() => Date)
  @IsDate()
  end: Date

  @IsString()
  reason: string

  @IsEnum(HolidayState)
  @IsOptional()
  state?: HolidayState

  @IsEnum(HolidayType)
  @IsOptional()
  type?: HolidayType
}

export class UpdateHolidayDto {
  @Type(() => Date)
  @IsDate()
  start?: Date

  @Type(() => Date)
  @IsDate()
  end?: Date

  @IsString()
  reason?: string

  @IsEnum(HolidayState)
  @IsOptional()
  state?: HolidayState
} 