import { Injectable } from "@nestjs/common";
import { Prisma, TradingAccount } from "@prisma/client";
import {
  DealPayload,
  SyncDealsPayload,
  SyncDealsResponse,
} from "@trademind/shared";
import { PrismaService } from "../prisma/prisma.service";
import {
  AggregatedTrade,
  aggregatePosition,
  brokerTimeToUtc,
  openPositionToTrade,
} from "./metrics";

@Injectable()
export class IngestionService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Idempotent: raw deals are createMany+skipDuplicates on (accountId, ticket),
   * and trades are recomputed from ALL stored deals of each affected position,
   * so replaying a batch (EA retry, overlapping cursor) changes nothing.
   */
  async ingest(
    account: TradingAccount,
    payload: SyncDealsPayload,
  ): Promise<SyncDealsResponse> {
    const db = this.prisma.client;
    const offset = account.utcOffsetMinutes;

    const stored = payload.deals.length
      ? await db.rawDeal.createMany({
          data: payload.deals.map((d) => ({
            accountId: account.id,
            ticket: BigInt(d.ticket),
            positionId: BigInt(d.positionId),
            time: brokerTimeToUtc(d.time, offset),
            payload: d as unknown as Prisma.InputJsonValue,
          })),
          skipDuplicates: true,
        })
      : { count: 0 };

    const openByPosition = new Map(
      payload.openPositions.map((p) => [p.positionId, p]),
    );
    const affected = new Set<number>([
      ...payload.deals.map((d) => d.positionId),
      ...payload.openPositions.map((p) => p.positionId),
    ]);

    let upsertedTrades = 0;
    for (const positionId of affected) {
      const rawDeals = await db.rawDeal.findMany({
        where: { accountId: account.id, positionId: BigInt(positionId) },
      });
      const deals = rawDeals.map((r) => r.payload as unknown as DealPayload);

      let trade = deals.length > 0 ? aggregatePosition(deals, offset) : null;
      const openPos = openByPosition.get(positionId);
      if (!trade && openPos) trade = openPositionToTrade(openPos, offset);
      if (!trade) continue;

      // A live snapshot is authoritative for floating P/L and current SL/TP.
      if (trade.state === "open" && openPos) {
        trade.profit = round2(trade.profit + openPos.profit);
        trade.netProfit = round2(trade.netProfit + openPos.profit + openPos.swap - trade.swap);
        trade.swap = round2(openPos.swap);
        trade.sl = openPos.sl > 0 ? openPos.sl : trade.sl;
        trade.tp = openPos.tp > 0 ? openPos.tp : trade.tp;
      }

      await this.upsertTrade(account.id, trade);
      upsertedTrades++;
    }

    const maxTicket = payload.deals.reduce(
      (max, d) => (d.ticket > max ? d.ticket : max),
      Number(account.lastDealTicket),
    );
    if (BigInt(maxTicket) !== account.lastDealTicket) {
      await db.tradingAccount.update({
        where: { id: account.id },
        data: { lastDealTicket: BigInt(maxTicket) },
      });
    }

    return {
      storedDeals: stored.count,
      upsertedTrades,
      lastDealTicket: maxTicket,
    };
  }

  private async upsertTrade(accountId: string, t: AggregatedTrade) {
    const data = {
      symbol: t.symbol,
      direction: t.direction,
      state: t.state,
      volume: t.volume,
      entryPrice: t.entryPrice,
      exitPrice: t.exitPrice,
      sl: t.sl,
      tp: t.tp,
      openTime: t.openTime,
      closeTime: t.closeTime,
      commission: t.commission,
      swap: t.swap,
      profit: t.profit,
      netProfit: t.netProfit,
      pips: t.pips,
      rr: t.rr,
      durationSec: t.durationSec,
      digits: t.digits,
      point: t.point,
    };
    await this.prisma.client.trade.upsert({
      where: {
        accountId_ticket: { accountId, ticket: BigInt(t.ticket) },
      },
      create: { accountId, ticket: BigInt(t.ticket), ...data },
      update: data,
    });
  }
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
