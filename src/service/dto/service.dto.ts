import { IsString, IsNumber } from "class-validator"

export class CreateServiceDto {
  @IsString()
  name: string

  @IsNumber()
  price: number
}

export class UpdateServiceDto {
  @IsString()
  name?: string

  @IsNumber()
  price?: number
}

