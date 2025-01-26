import { IsString, IsNumber, IsOptional } from 'class-validator';

export class CreateStudioDto {
  @IsNumber()
  price: number;

  @IsNumber()
  value: number;
}

export class UpdateStudioDto {
  @IsNumber()
  @IsOptional()
  price?: number;

  @IsNumber()
  @IsOptional()
  value?: number;
}
