import { Module } from "@nestjs/common"
import { APP_GUARD } from "@nestjs/core"
import { RolesGuard } from "../auth/roles.guards"
import { ConfigModule } from "@nestjs/config"
import { AuthModule } from "../auth/auth.module"

@Module({
  imports: [ConfigModule, AuthModule],
  providers: [
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    }
  ],
  exports: [ConfigModule],
})
export class CommonModule {}

