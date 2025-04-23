import { IsString, IsEnum, IsOptional, MinLength } from "class-validator"
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

  @IsString()
  @IsOptional()
  notes?: string

  @IsString()
  @IsOptional()
  managerId?: string
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

export class RegisterDto {
  @IsString()
  username: string

  @IsString()
  @MinLength(6)
  password: string

  @IsString()
  @IsOptional()
  managerId?: string
}