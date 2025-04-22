import { IsString, IsDate, IsEnum, IsOptional } from "class-validator"
import { Type } from "class-transformer"

export class CreateReportDto {
  @IsString()
  userId: Date

  @IsString()
  reason: string

  @IsOptional()
  @IsString()
  phone: string
}
