import { IsString, IsEnum, IsOptional } from "class-validator"
import { Role } from "@prisma/client"

export class CreateUserDto {
  @IsString()
  username: string

  @IsString()
  password: string

  @IsEnum(Role)
  @IsOptional()
  role?: Role

  @IsString()
  @IsOptional()
  phone?: string

  @IsString()
  @IsOptional()
  entityId?: string
}

export class UpdateUserDto {
  @IsString()
  @IsOptional()
  username?: string

  @IsString()
  @IsOptional()
  password?: string

  @IsEnum(Role)
  @IsOptional()
  role?: Role

  @IsString()
  @IsOptional()
  phone?: string

  @IsString()
  @IsOptional()
  entityId?: string
} 