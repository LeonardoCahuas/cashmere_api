import { PipeTransform, Injectable, ArgumentMetadata, BadRequestException } from '@nestjs/common';

@Injectable()
export class ParseDatePipe implements PipeTransform<string, Date | undefined> {
  transform(value: string, metadata: ArgumentMetadata): Date | undefined {
    if (!value) return undefined;
    
    const date = new Date(value);
    if (isNaN(date.getTime())) {
      throw new BadRequestException('Invalid date format');
    }
    return date;
  }
} 