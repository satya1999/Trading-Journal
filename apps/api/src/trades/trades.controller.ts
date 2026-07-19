import {
  Body,
  Controller,
  Get,
  Param,
  Put,
  Query,
  UseGuards,
} from "@nestjs/common";
import type { SessionUser } from "../auth/auth";
import { CurrentUser, SessionGuard } from "../auth/session.guard";
import { TradesService, toTradeDto } from "./trades.service";

@Controller("trades")
@UseGuards(SessionGuard)
export class TradesController {
  constructor(private readonly trades: TradesService) {}

  @Get()
  list(
    @CurrentUser() user: SessionUser,
    @Query("accountId") accountId?: string,
    @Query("symbol") symbol?: string,
    @Query("state") state?: string,
    @Query("from") from?: string,
    @Query("to") to?: string,
    @Query("page") page?: string,
    @Query("pageSize") pageSize?: string,
  ) {
    return this.trades.list(user.id, {
      accountId,
      symbol,
      state,
      from,
      to,
      page: Math.max(1, Number(page) || 1),
      pageSize: Math.min(200, Math.max(1, Number(pageSize) || 50)),
    });
  }

  @Get(":id")
  async get(@CurrentUser() user: SessionUser, @Param("id") id: string) {
    return toTradeDto(await this.trades.getOwned(user.id, id));
  }

  @Put(":id/note")
  updateNote(
    @CurrentUser() user: SessionUser,
    @Param("id") id: string,
    @Body()
    body: { note?: string; strategy?: string; setup?: string; tags?: string[] },
  ) {
    return this.trades.upsertNote(user.id, id, body ?? {});
  }
}
