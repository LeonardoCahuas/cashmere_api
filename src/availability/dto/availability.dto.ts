import { IsString, IsDate } from "class-validator"
import { Type } from "class-transformer"

export class CreateAvailabilityDto {
  @IsString()
  day: string

  @Type(() => Date)
  @IsDate()
  start: Date

  @Type(() => Date)
  @IsDate()
  end: Date
}

export class GetAvailabilityQueryDto {
  @IsString()
  fonicoId: string

  @Type(() => Date)
  @IsDate()
  date: Date
}

