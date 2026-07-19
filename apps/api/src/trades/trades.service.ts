import { Injectable, NotFoundException } from "@nestjs/common";
import { Prisma, Trade, TradeNote } from "@prisma/client";
import { TradeDto } from "@trademind/shared";
import { PrismaService } from "../prisma/prisma.service";

export function toTradeDto(t: Trade & { note?: TradeNote | null }): TradeDto {
  return {
    id: t.id,
    accountId: t.accountId,
    ticket: Number(t.ticket),
    symbol: t.symbol,
    direction: t.direction as TradeDto["direction"],
    state: t.state as TradeDto["state"],
    volume: t.volume,
    entryPrice: t.entryPrice,
    exitPrice: t.exitPrice,
    sl: t.sl,
    tp: t.tp,
    openTime: t.openTime.toISOString(),
    closeTime: t.closeTime?.toISOString() ?? null,
    commission: t.commission,
    swap: t.swap,
    profit: t.profit,
    netProfit: t.netProfit,
    pips: t.pips,
    rr: t.rr,
    durationSec: t.durationSec,
    note: t.note
      ? {
          note: t.note.note,
          strategy: t.note.strategy,
          setup: t.note.setup,
          tags: t.note.tags,
        }
      : null,
  };
}

export interface TradeFilters {
  accountId?: string;
  symbol?: string;
  state?: string;
  from?: string;
  to?: string;
  page: number;
  pageSize: number;
}

@Injectable()
export class TradesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(userId: string, f: TradeFilters) {
    const where: Prisma.TradeWhereInput = {
      account: { userId },
      ...(f.accountId ? { accountId: f.accountId } : {}),
      ...(f.symbol ? { symbol: { equals: f.symbol, mode: "insensitive" } } : {}),
      ...(f.state === "open" || f.state === "closed" ? { state: f.state } : {}),
      ...(f.from || f.to
        ? {
            openTime: {
              ...(f.from ? { gte: new Date(f.from) } : {}),
              ...(f.to ? { lte: new Date(f.to) } : {}),
            },
          }
        : {}),
    };
    const [total, trades] = await this.prisma.client.$transaction([
      this.prisma.client.trade.count({ where }),
      this.prisma.client.trade.findMany({
        where,
        include: { note: true },
        orderBy: { openTime: "desc" },
        skip: (f.page - 1) * f.pageSize,
        take: f.pageSize,
      }),
    ]);
    return { total, page: f.page, pageSize: f.pageSize, items: trades.map(toTradeDto) };
  }

  async getOwned(userId: string, id: string) {
    const trade = await this.prisma.client.trade.findFirst({
      where: { id, account: { userId } },
      include: { note: true },
    });
    if (!trade) throw new NotFoundException("Trade not found");
    return trade;
  }

  async upsertNote(
    userId: string,
    tradeId: string,
    body: { note?: string | null; strategy?: string | null; setup?: string | null; tags?: string[] },
  ) {
    await this.getOwned(userId, tradeId);
    const data = {
      note: body.note ?? null,
      strategy: body.strategy ?? null,
      setup: body.setup ?? null,
      tags: Array.isArray(body.tags) ? body.tags.map(String).slice(0, 20) : [],
    };
    await this.prisma.client.tradeNote.upsert({
      where: { tradeId },
      create: { tradeId, ...data },
      update: data,
    });
    return toTradeDto(await this.getOwned(userId, tradeId));
  }
}
