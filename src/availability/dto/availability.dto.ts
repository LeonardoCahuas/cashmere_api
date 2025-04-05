import { IsString, IsDate, IsOptional } from "class-validator"
import { Type } from "class-transformer"

export class CreateAvailabilityDto {
  @IsString()
  day: string

  @IsString()
  start: string

  @IsString()
  end: string

  @IsString()
  @IsOptional()
  engineerId?: string
}

export class GetAvailabilityQueryDto {
  @IsString()
  engineerId: string

  @Type(() => Date)
  @IsDate()
  date: Date
}

