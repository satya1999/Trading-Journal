import { Controller, Get, Module } from "@nestjs/common";
import { AccountsModule } from "./accounts/accounts.module";
import { AnalyticsModule } from "./analytics/analytics.module";
import { PrismaModule } from "./prisma/prisma.module";
import { SyncModule } from "./sync/sync.module";
import { TradesModule } from "./trades/trades.module";

@Controller()
class HealthController {
  @Get("health")
  health() {
    return { ok: true, service: "trademind-api" };
  }
}

@Module({
  imports: [PrismaModule, AccountsModule, SyncModule, TradesModule, AnalyticsModule],
  controllers: [HealthController],
})
export class AppModule {}
