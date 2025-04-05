import { Injectable, type NestInterceptor, type ExecutionContext, type CallHandler } from "@nestjs/common"
import type { Observable } from "rxjs"
import { map } from "rxjs/operators"
import { plainToInstance } from "class-transformer"

@Injectable()
export class TransformInterceptor implements NestInterceptor {
  constructor(private readonly classType: any) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      map((data) => {
        return plainToInstance(this.classType, data, {
          excludeExtraneousValues: true,
          enableImplicitConversion: true,
        })
      }),
    )
  }
}

