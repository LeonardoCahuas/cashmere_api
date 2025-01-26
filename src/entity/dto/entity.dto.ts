import { IsString, IsArray, IsOptional } from "class-validator"

export class CreateEntityDto {
  @IsString()
  name: string

  @IsArray()
  @IsOptional()
  userIds?: string[]
}

export class UpdateEntityDto {
  @IsString()
  @IsOptional()
  name?: string

  @IsArray()
  @IsOptional()
  userIds?: string[]
}

