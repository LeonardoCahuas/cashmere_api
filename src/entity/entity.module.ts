import { Module } from "@nestjs/common"
import { EntityController } from "./entity.controller"
import { EntityService } from "./entity.service"
import { PrismaService } from "../prisma/prisma.service"

@Module({
  controllers: [EntityController],
  providers: [EntityService, PrismaService],
  exports: [EntityService],
})
export class EntityModule {}

