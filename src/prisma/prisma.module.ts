import { Module } from "@nestjs/common"
import { PrismaService } from "./prisma.service"
//cuai
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}

