import { BadRequestException, Controller, Get, Query, UseGuards } from "@nestjs/common";
import type { SessionUser } from "../auth/auth";
import { CurrentUser, SessionGuard } from "../auth/session.guard";
import { AnalyticsService } from "./analytics.service";

@Controller("analytics")
@UseGuards(SessionGuard)
export class AnalyticsController {
  constructor(private readonly analytics: AnalyticsService) {}

  @Get("summary")
  summary(
    @CurrentUser() user: SessionUser,
    @Query("accountId") accountId?: string,
  ) {
    return this.analytics.summary(user.id, accountId || undefined);
  }

  @Get("equity-curve")
  equityCurve(
    @CurrentUser() user: SessionUser,
    @Query("accountId") accountId?: string,
  ) {
    return this.analytics.equityCurve(user.id, accountId || undefined);
  }

  @Get("breakdown")
  breakdown(
    @CurrentUser() user: SessionUser,
    @Query("accountId") accountId?: string,
  ) {
    return this.analytics.breakdown(user.id, accountId || undefined);
  }

  @Get("calendar")
  calendar(
    @CurrentUser() user: SessionUser,
    @Query("month") month?: string,
    @Query("accountId") accountId?: string,
  ) {
    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      throw new BadRequestException("month must be YYYY-MM");
    }
    return this.analytics.calendar(user.id, month, accountId || undefined);
  }
}
