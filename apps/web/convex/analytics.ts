import { v } from "convex/values";
import { query } from "./_generated/server";
import { getSessionUser } from "./auth";
import { computeBreakdown } from "./breakdown";

const round2 = (n: number) => Math.round(n * 100) / 100;

// Helper to gather account IDs
async function getAccountIds(ctx: any, user: any, accountId?: string): Promise<any[]> {
  if (accountId) {
    const account = (await ctx.db.get(accountId as any)) as any;
    if (!account || account.userId !== user._id) {
      throw new Error("Trading account not found");
    }
    return [account._id];
  }

  const accounts = await ctx.db
    .query("tradingAccounts")
    .withIndex("by_userId", (q: any) => q.eq("userId", user._id))
    .collect();
  return accounts.map((a: any) => a._id);
}

// Summary statistics
export const summary = query({
  args: {
    token: v.string(),
    accountId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getSessionUser(ctx, args.token);
    if (!user) throw new Error("Unauthorized");

    const ids = await getAccountIds(ctx, user, args.accountId);

    // Fetch accounts to sum balance and equity
    let balance = 0;
    let equity = 0;
    for (const id of ids) {
      const account = (await ctx.db.get(id)) as { balance: number; equity: number } | null;
      if (account) {
        balance += account.balance;
        equity += account.equity;
      }
    }

    // Fetch closed trades
    const trades = await ctx.db
      .query("trades")
      .collect();
    
    const closed = trades
      .filter((t) => ids.includes(t.accountId) && t.state === "closed")
      .sort((a, b) => (a.closeTime ?? 0) - (b.closeTime ?? 0));

    const openTradesCount = trades.filter((t) => ids.includes(t.accountId) && t.state === "open").length;

    const wins = closed.filter((t) => t.netProfit > 0);
    const losses = closed.filter((t) => t.netProfit < 0);
    const grossWin = wins.reduce((s, t) => s + t.netProfit, 0);
    const grossLoss = Math.abs(losses.reduce((s, t) => s + t.netProfit, 0));
    const netProfit = closed.reduce((s, t) => s + t.netProfit, 0);

    const todayStart = new Date();
    todayStart.setUTCHours(0, 0, 0, 0);
    const todayPnl = closed
      .filter((t) => t.closeTime && t.closeTime >= todayStart.getTime())
      .reduce((s, t) => s + t.netProfit, 0);

    const withRR = closed.filter((t) => t.rr != null);

    // Max drawdown
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
      profitFactor: grossLoss > 0 ? round2(grossWin / grossLoss) : grossWin > 0 ? Infinity : null,
      maxDrawdown: closed.length ? round2(maxDrawdown) : null,
      openTrades: openTradesCount,
      closedTrades: closed.length,
      netProfit: round2(netProfit),
      avgRR: withRR.length
        ? round2(withRR.reduce((s, t) => s + (t.rr ?? 0), 0) / withRR.length)
        : null,
    };
  },
});

// Equity and Balance curve points
export const equityCurve = query({
  args: {
    token: v.string(),
    accountId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getSessionUser(ctx, args.token);
    if (!user) throw new Error("Unauthorized");

    const ids = await getAccountIds(ctx, user, args.accountId);

    // Total current balance
    let currentBalance = 0;
    for (const id of ids) {
      const account = (await ctx.db.get(id)) as { balance: number } | null;
      if (account) currentBalance += account.balance;
    }

    // Closed trades
    const trades = await ctx.db
      .query("trades")
      .collect();
    
    const closed = trades
      .filter((t) => ids.includes(t.accountId) && t.state === "closed" && t.closeTime != null)
      .sort((a, b) => (a.closeTime ?? 0) - (b.closeTime ?? 0));

    const totalNet = closed.reduce((s, t) => s + t.netProfit, 0);

    let running = currentBalance - totalNet;
    const curvePoints: any[] = [
      ...(closed.length
        ? [{ time: new Date(closed[0].closeTime!).toISOString(), balance: round2(running), equity: round2(running) }]
        : []),
    ];

    for (const t of closed) {
      running += t.netProfit;
      curvePoints.push({
        time: new Date(t.closeTime!).toISOString(),
        balance: round2(running),
        equity: round2(running),
      });
    }

    // Historical snapshots (limit 500)
    let snapshotsQuery = ctx.db.query("accountSnapshots");
    const allSnapshots = await snapshotsQuery.collect();
    const filteredSnapshots = allSnapshots
      .filter((s) => ids.includes(s.accountId))
      .sort((a, b) => b.at - a.at)
      .slice(0, 500)
      .reverse();

    const snapshots = filteredSnapshots.map((s) => ({
      time: new Date(s.at).toISOString(),
      balance: round2(s.balance),
      equity: round2(s.equity),
    }));

    return { trades: curvePoints, snapshots };
  },
});

// Analytics Breakdown containing our new Session, Strategy, and Duration features
export const breakdown = query({
  args: {
    token: v.string(),
    accountId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getSessionUser(ctx, args.token);
    if (!user) throw new Error("Unauthorized");

    const ids = await getAccountIds(ctx, user, args.accountId);

    // Fetch closed trades
    const trades = await ctx.db
      .query("trades")
      .collect();

    const closed = trades.filter(
      (t) => ids.includes(t.accountId) && t.state === "closed" && t.closeTime != null
    );

    // Map trades with notes for strategy and setup tags
    const closedRows = await Promise.all(
      closed.map(async (t) => {
        const note = await ctx.db
          .query("tradeNotes")
          .withIndex("by_tradeId", (q: any) => q.eq("tradeId", t._id))
          .unique();

        return {
          symbol: t.symbol,
          netProfit: t.netProfit,
          rr: t.rr ?? null,
          sl: t.sl ?? null,
          openTime: new Date(t.openTime),
          closeTime: new Date(t.closeTime!),
          durationSec: t.durationSec ?? null,
          strategy: note ? (note.strategy ?? null) : null,
          setup: note ? (note.setup ?? null) : null,
        };
      })
    );

    return computeBreakdown(closedRows);
  },
});

// Trading Calendar day mapping
export const calendar = query({
  args: {
    token: v.string(),
    month: v.string(), // YYYY-MM
    accountId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getSessionUser(ctx, args.token);
    if (!user) throw new Error("Unauthorized");

    const ids = await getAccountIds(ctx, user, args.accountId);

    const [y, m] = args.month.split("-").map(Number);
    const start = new Date(Date.UTC(y, m - 1, 1)).getTime();
    const end = new Date(Date.UTC(y, m, 1)).getTime();

    // Fetch closed trades in the month range
    const trades = await ctx.db
      .query("trades")
      .collect();

    const closed = trades.filter(
      (t) =>
        ids.includes(t.accountId) &&
        t.state === "closed" &&
        t.closeTime != null &&
        t.closeTime >= start &&
        t.closeTime < end
    );

    const byDay = new Map<string, any>();
    for (const t of closed) {
      const date = new Date(t.closeTime!).toISOString().slice(0, 10);
      const day = byDay.get(date) ?? { date, pnl: 0, trades: 0, wins: 0, losses: 0 };
      day.pnl = round2(day.pnl + t.netProfit);
      day.trades++;
      if (t.netProfit > 0) day.wins++;
      else if (t.netProfit < 0) day.losses++;
      byDay.set(date, day);
    }

    return [...byDay.values()].sort((a, b) => a.date.localeCompare(b.date));
  },
});
