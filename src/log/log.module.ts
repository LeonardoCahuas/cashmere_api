import { Module } from "@nestjs/common"
import { LogService } from "./log.service"
import { PrismaModule } from "../prisma/prisma.module"
import { LogController } from "./log.controller"

@Module({
  imports: [PrismaModule],
  controllers:[LogController],
  providers: [LogService],
  exports: [LogService],
})
export class LogModule {}