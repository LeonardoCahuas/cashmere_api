import { IsString, IsEmail, MinLength, IsOptional } from "class-validator"

export class RegisterDto {
  @IsString()
  username: string

  @IsString()
  @MinLength(6)
  password: string

  @IsString()
  @IsOptional()
  phone?: string
}

export class LoginDto {
  @IsString()
  username: string

  @IsString()
  password: string
}

