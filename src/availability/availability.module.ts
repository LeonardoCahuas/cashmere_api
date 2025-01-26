import { Module } from "@nestjs/common"
import { AvailabilityController } from "./availability.controller"
import { AvailabilityService } from "./availability.service"
import { PrismaService } from "../prisma/prisma.service"
import { AuthModule } from "../auth/auth.module"
import { CommonModule } from "@/common/common.module"

@Module({
  imports: [AuthModule, CommonModule],
  controllers: [AvailabilityController],
  providers: [AvailabilityService, PrismaService],
  exports: [AvailabilityService],
})
export class AvailabilityModule {}

