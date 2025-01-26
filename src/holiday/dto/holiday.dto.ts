import { IsString, IsDate } from "class-validator"
import { Type } from "class-transformer"

export class CreateHolidayDto {
  @Type(() => Date)
  @IsDate()
  start: Date

  @Type(() => Date)
  @IsDate()
  end: Date

  @IsString()
  reason: string
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
} 