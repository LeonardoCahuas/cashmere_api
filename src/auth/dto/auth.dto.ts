import { Expose, Transform } from "class-transformer"
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
export class GoogleLoginDto {
  @Expose()
  @IsString()
  supabaseToken: string
}
export class LoginResponseDto {
  @Expose()
  token: string

  @Expose()
  @Transform(({ obj }) => ({
    id: obj.user.id,
    username: obj.user.username,
    role: obj.user.role,
  }))
  user: {
    id: string
    username: string
    role: string
  }
}



