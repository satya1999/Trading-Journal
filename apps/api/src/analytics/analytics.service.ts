import { Injectable, NotFoundException } from "@nestjs/common";
import {
  AnalyticsBreakdown,
  AnalyticsSummary,
  CalendarDay,
  EquityPoint,
} from "@trademind/shared";
import { PrismaService } from "../prisma/prisma.service";
import { computeBreakdown } from "./breakdown";

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  private async accountIds(userId: string, accountId?: string): Promise<string[]> {
    const accounts = await this.prisma.client.tradingAccount.findMany({
      where: { userId, ...(accountId ? { id: accountId } : {}) },
      select: { id: true },
    });
    if (accountId && accounts.length === 0) {
      throw new NotFoundException("Trading account not found");
    }
    return accounts.map((a) => a.id);
  }

  async summary(userId: string, accountId?: string): Promise<AnalyticsSummary> {
    const ids = await this.accountIds(userId, accountId);
    const db = this.prisma.client;

    const accounts = await db.tradingAccount.findMany({
      where: { id: { in: ids } },
      select: { balance: true, equity: true },
    });
    const balance = accounts.reduce((s, a) => s + a.balance, 0);
    const equity = accounts.reduce((s, a) => s + a.equity, 0);

    const closed = await db.trade.findMany({
      where: { accountId: { in: ids }, state: "closed" },
      select: { netProfit: true, rr: true, closeTime: true },
      orderBy: { closeTime: "asc" },
    });
    const openTrades = await db.trade.count({
      where: { accountId: { in: ids }, state: "open" },
    });

    const wins = closed.filter((t) => t.netProfit > 0);
    const losses = closed.filter((t) => t.netProfit < 0);
    const grossWin = wins.reduce((s, t) => s + t.netProfit, 0);
    const grossLoss = Math.abs(losses.reduce((s, t) => s + t.netProfit, 0));
    const netProfit = closed.reduce((s, t) => s + t.netProfit, 0);

    const todayStart = new Date();
    todayStart.setUTCHours(0, 0, 0, 0);
    const todayPnl = closed
      .filter((t) => t.closeTime && t.closeTime >= todayStart)
      .reduce((s, t) => s + t.netProfit, 0);

    const withRR = closed.filter((t) => t.rr != null);

    // Max drawdown over the realized-balance series (peak-to-trough, currency).
    let peak = balance - netProfit;
    let running = peak;
    let maxDrawdown = 0;
    for (const t of closed) {
      running += t.netProfit;
      peak = Math.max(peak, running);
      maxDrawdown = Math.max(maxDrawdown, peak - running);
    }

    return {
      balance: round2(balance),
      equity: round2(equity),
      todayPnl: round2(todayPnl),
      winRate: closed.length ? round2((wins.length / closed.length) * 100) : null,
      profitFactor:
        grossLoss > 0 ? round2(grossWin / grossLoss) : grossWin > 0 ? Infinity : null,
      maxDrawdown: closed.length ? round2(maxDrawdown) : null,
      openTrades,
      closedTrades: closed.length,
      netProfit: round2(netProfit),
      avgRR: withRR.length
        ? round2(withRR.reduce((s, t) => s + (t.rr ?? 0), 0) / withRR.length)
        : null,
    };
  }

  /** Realized balance curve from closed trades, anchored so it ends at the
   *  account's current balance; plus recent equity snapshots from heartbeats. */
  async equityCurve(userId: string, accountId?: string) {
    const ids = await this.accountIds(userId, accountId);
    const db = this.prisma.client;

    const accounts = await db.tradingAccount.findMany({
      where: { id: { in: ids } },
      select: { balance: true },
    });
    const currentBalance = accounts.reduce((s, a) => s + a.balance, 0);

    const closed = await db.trade.findMany({
      where: { accountId: { in: ids }, state: "closed", closeTime: { not: null } },
      select: { netProfit: true, closeTime: true },
      orderBy: { closeTime: "asc" },
    });
    const totalNet = closed.reduce((s, t) => s + t.netProfit, 0);

    let running = currentBalance - totalNet;
    const trades: EquityPoint[] = [
      ...(closed.length
        ? [{ time: closed[0].closeTime!.toISOString(), balance: round2(running), equity: round2(running) }]
        : []),
    ];
    for (const t of closed) {
      running += t.netProfit;
      trades.push({
        time: t.closeTime!.toISOString(),
        balance: round2(running),
        equity: round2(running),
      });
    }

    const rawSnapshots = await db.accountSnapshot.findMany({
      where: { accountId: { in: ids } },
      orderBy: { at: "desc" },
      take: 500,
    });
    const snapshots: EquityPoint[] = rawSnapshots
      .reverse()
      .map((s) => ({
        time: s.at.toISOString(),
        balance: round2(s.balance),
        equity: round2(s.equity),
      }));

    return { trades, snapshots };
  }

  async breakdown(
    userId: string,
    accountId?: string,
  ): Promise<AnalyticsBreakdown> {
    const ids = await this.accountIds(userId, accountId);
    const closed = await this.prisma.client.trade.findMany({
      where: {
        accountId: { in: ids },
        state: "closed",
        closeTime: { not: null },
      },
      select: {
        symbol: true,
        netProfit: true,
        rr: true,
        sl: true,
        openTime: true,
        closeTime: true,
      },
    });
    return computeBreakdown(
      closed.map((t) => ({ ...t, closeTime: t.closeTime! })),
    );
  }

  async calendar(
    userId: string,
    month: string, // YYYY-MM
    accountId?: string,
  ): Promise<CalendarDay[]> {
    const ids = await this.accountIds(userId, accountId);
    const [y, m] = month.split("-").map(Number);
    const start = new Date(Date.UTC(y, (m || 1) - 1, 1));
    const end = new Date(Date.UTC(y, m || 1, 1));

    const closed = await this.prisma.client.trade.findMany({
      where: {
        accountId: { in: ids },
        state: "closed",
        closeTime: { gte: start, lt: end },
      },
      select: { netProfit: true, closeTime: true },
    });

    const byDay = new Map<string, CalendarDay>();
    for (const t of closed) {
      const date = t.closeTime!.toISOString().slice(0, 10);
      const day =
        byDay.get(date) ?? { date, pnl: 0, trades: 0, wins: 0, losses: 0 };
      day.pnl = round2(day.pnl + t.netProfit);
      day.trades++;
      if (t.netProfit > 0) day.wins++;
      else if (t.netProfit < 0) day.losses++;
      byDay.set(date, day);
    }
    return [...byDay.values()].sort((a, b) => a.date.localeCompare(b.date));
  }
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
