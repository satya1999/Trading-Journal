import { v } from "convex/values";
import { mutation } from "./_generated/server";
import { aggregatePosition, brokerTimeToUtc, openPositionToTrade } from "./metrics";

// Handshake
export const handshake = mutation({
  args: {
    tokenHash: v.string(),
    accountNumber: v.number(),
    broker: v.string(),
    server: v.string(),
    currency: v.string(),
    leverage: v.number(),
    balance: v.number(),
    equity: v.number(),
    utcOffsetMinutes: v.number(),
    accountName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // 1. Find account by sync token
    const account = await ctx.db
      .query("tradingAccounts")
      .withIndex("by_syncTokenHash", (q) => q.eq("syncTokenHash", args.tokenHash))
      .unique();
    if (!account) {
      throw new Error("Invalid sync token");
    }

    // 2. Update account info
    await ctx.db.patch(account._id, {
      accountNumber: args.accountNumber,
      broker: args.broker,
      server: args.server,
      currency: args.currency,
      leverage: args.leverage,
      balance: args.balance,
      equity: args.equity,
      utcOffsetMinutes: args.utcOffsetMinutes,
      lastHeartbeatAt: Date.now(),
    });

    return {
      accountId: account._id,
      lastDealTicket: account.lastDealTicket,
    };
  },
});

// Heartbeat
export const heartbeat = mutation({
  args: {
    tokenHash: v.string(),
    balance: v.number(),
    equity: v.number(),
    margin: v.number(),
    freeMargin: v.number(),
    openPositions: v.number(),
  },
  handler: async (ctx, args) => {
    // 1. Find account by sync token
    const account = await ctx.db
      .query("tradingAccounts")
      .withIndex("by_syncTokenHash", (q) => q.eq("syncTokenHash", args.tokenHash))
      .unique();
    if (!account) {
      throw new Error("Invalid sync token");
    }

    // 2. Update account balance/equity
    await ctx.db.patch(account._id, {
      balance: args.balance,
      equity: args.equity,
      margin: args.margin,
      freeMargin: args.freeMargin,
      lastHeartbeatAt: Date.now(),
    });

    // 3. Create snapshot
    await ctx.db.insert("accountSnapshots", {
      accountId: account._id,
      balance: args.balance,
      equity: args.equity,
      margin: args.margin,
      freeMargin: args.freeMargin,
      at: Date.now(),
    });

    return { ok: true };
  },
});

// Sync Deals & Positions
export const deals = mutation({
  args: {
    tokenHash: v.string(),
    deals: v.array(
      v.object({
        ticket: v.number(),
        positionId: v.number(),
        orderTicket: v.number(),
        symbol: v.string(),
        type: v.union(v.literal("buy"), v.literal("sell")),
        entry: v.union(v.literal("in"), v.literal("out"), v.literal("inout"), v.literal("out_by")),
        volume: v.number(),
        price: v.number(),
        sl: v.number(),
        tp: v.number(),
        commission: v.number(),
        swap: v.number(),
        profit: v.number(),
        time: v.number(), // unix seconds
        digits: v.number(),
        point: v.number(),
        // Optional metadata the EA includes; Convex validators reject unknown
        // keys, so every field the EA can send must be declared here.
        magic: v.optional(v.number()),
        comment: v.optional(v.string()),
      })
    ),
    openPositions: v.array(
      v.object({
        positionId: v.number(),
        symbol: v.string(),
        type: v.union(v.literal("buy"), v.literal("sell")),
        volume: v.number(),
        openPrice: v.number(),
        sl: v.number(),
        tp: v.number(),
        currentPrice: v.number(),
        profit: v.number(),
        swap: v.number(),
        openTime: v.number(), // unix seconds
        digits: v.number(),
        point: v.number(),
      })
    ),
  },
  handler: async (ctx, args) => {
    // 1. Find account by sync token
    const account = await ctx.db
      .query("tradingAccounts")
      .withIndex("by_syncTokenHash", (q) => q.eq("syncTokenHash", args.tokenHash))
      .unique();
    if (!account) {
      throw new Error("Invalid sync token");
    }

    const offset = account.utcOffsetMinutes;

    // 2. Insert raw deals if they don't already exist
    let storedDeals = 0;
    for (const d of args.deals) {
      const existing = await ctx.db
        .query("rawDeals")
        .withIndex("by_account_ticket", (q) =>
          q.eq("accountId", account._id).eq("ticket", d.ticket)
        )
        .unique();
      if (!existing) {
        await ctx.db.insert("rawDeals", {
          accountId: account._id,
          ticket: d.ticket,
          positionId: d.positionId,
          time: brokerTimeToUtc(d.time, offset),
          payload: d,
        });
        storedDeals++;
      }
    }

    // 3. Find affected position IDs
    const openByPosition = new Map(args.openPositions.map((p) => [p.positionId, p]));
    const affected = new Set<number>([
      ...args.deals.map((d) => d.positionId),
      ...args.openPositions.map((p) => p.positionId),
    ]);

    // 4. Recompute / update trades for each affected position
    let upsertedTrades = 0;
    for (const positionId of affected) {
      const rawDeals = await ctx.db
        .query("rawDeals")
        .withIndex("by_account_positionId", (q) =>
          q.eq("accountId", account._id).eq("positionId", positionId)
        )
        .collect();

      const dealsList = rawDeals.map((r) => r.payload);

      let trade = dealsList.length > 0 ? aggregatePosition(dealsList, offset) : null;
      const openPos = openByPosition.get(positionId);
      if (!trade && openPos) {
        trade = openPositionToTrade(openPos, offset);
      }
      if (!trade) continue;

      // Apply authoritative floating figures if open
      if (trade.state === "open" && openPos) {
        trade.profit = round2(trade.profit + openPos.profit);
        trade.netProfit = round2(trade.netProfit + openPos.profit + openPos.swap - trade.swap);
        trade.swap = round2(openPos.swap);
        trade.sl = openPos.sl > 0 ? openPos.sl : trade.sl;
        trade.tp = openPos.tp > 0 ? openPos.tp : trade.tp;
      }

      // Upsert into trades collection
      const existingTrade = await ctx.db
        .query("trades")
        .withIndex("by_account_ticket", (q) =>
          q.eq("accountId", account._id).eq("ticket", trade!.ticket)
        )
        .unique();

      const data = {
        accountId: account._id,
        ticket: trade.ticket,
        symbol: trade.symbol,
        direction: trade.direction,
        state: trade.state,
        volume: trade.volume,
        entryPrice: trade.entryPrice,
        exitPrice: trade.exitPrice ?? undefined,
        sl: trade.sl ?? undefined,
        tp: trade.tp ?? undefined,
        openTime: trade.openTime,
        closeTime: trade.closeTime ?? undefined,
        commission: trade.commission,
        swap: trade.swap,
        profit: trade.profit,
        netProfit: trade.netProfit,
        pips: trade.pips ?? undefined,
        rr: trade.rr ?? undefined,
        durationSec: trade.durationSec ?? undefined,
        digits: trade.digits,
        point: trade.point,
      };

      if (existingTrade) {
        await ctx.db.patch(existingTrade._id, data);
      } else {
        await ctx.db.insert("trades", data);
      }
      upsertedTrades++;
    }

    // 5. Update account's lastDealTicket
    const maxTicket = args.deals.reduce(
      (max, d) => (d.ticket > max ? d.ticket : max),
      account.lastDealTicket
    );
    if (maxTicket > account.lastDealTicket) {
      await ctx.db.patch(account._id, { lastDealTicket: maxTicket });
    }

    return {
      storedDeals,
      upsertedTrades,
      lastDealTicket: maxTicket,
    };
  },
});

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
