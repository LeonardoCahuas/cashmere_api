import { Module } from "@nestjs/common"
import { ConfigModule } from "@nestjs/config"
import { AuthModule } from "./auth/auth.module"
import { UserModule } from "./user/user.module"
import { HolidayModule } from "./holiday/holiday.module"
import { LogModule } from "./log/log.module"
import { BookingModule } from "./booking/booking.module"
import { AvailabilityModule } from "./availability/availability.module"
import { PrismaModule } from "./prisma/prisma.module"
import { CommonModule } from "./common/common.module"
import { StudioModule } from './studio/studio.module'
import { EntityModule } from "./entity/entity.module"
import { ReportModule } from "./report/report.module"

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    CommonModule,
    AuthModule,
    UserModule,
    HolidayModule,
    LogModule,
    BookingModule,
    StudioModule,
    EntityModule,
    AvailabilityModule,
    ReportModule
  ],
})
export class AppModule {}