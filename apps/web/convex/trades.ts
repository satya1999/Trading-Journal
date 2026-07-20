import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getSessionUser } from "./auth";

async function formatTradeDto(ctx: any, t: any) {
  const note = await ctx.db
    .query("tradeNotes")
    .withIndex("by_tradeId", (q: any) => q.eq("tradeId", t._id))
    .unique();

  return {
    id: t._id,
    accountId: t.accountId,
    ticket: t.ticket,
    symbol: t.symbol,
    direction: t.direction,
    state: t.state,
    volume: t.volume,
    entryPrice: t.entryPrice,
    exitPrice: t.exitPrice ?? null,
    sl: t.sl ?? null,
    tp: t.tp ?? null,
    openTime: new Date(t.openTime).toISOString(),
    closeTime: t.closeTime ? new Date(t.closeTime).toISOString() : null,
    commission: t.commission,
    swap: t.swap,
    profit: t.profit,
    netProfit: t.netProfit,
    pips: t.pips ?? null,
    rr: t.rr ?? null,
    durationSec: t.durationSec ?? null,
    note: note
      ? {
          note: note.note ?? null,
          strategy: note.strategy ?? null,
          setup: note.setup ?? null,
          tags: note.tags,
        }
      : null,
  };
}

// List trades with pagination and filters
export const list = query({
  args: {
    token: v.string(),
    accountId: v.optional(v.string()),
    symbol: v.optional(v.string()),
    state: v.optional(v.string()),
    paginationOpts: v.any(), // Convex Pagination Options
  },
  handler: async (ctx, args) => {
    const user = await getSessionUser(ctx, args.token);
    if (!user) throw new Error("Unauthorized");

    // Gather valid account IDs for the user
    let accountIds: string[] = [];
    if (args.accountId) {
      const account = (await ctx.db.get(args.accountId as any)) as any;
      if (!account || account.userId !== user._id) {
        throw new Error("Account not found");
      }
      accountIds = [account._id];
    } else {
      const accounts = await ctx.db
        .query("tradingAccounts")
        .withIndex("by_userId", (q) => q.eq("userId", user._id))
        .collect();
      accountIds = accounts.map((a) => a._id);
    }

    // Query trades
    let tradesQuery = ctx.db.query("trades");

    // Filter by account and sort by openTime desc
    // Since we want sorting by openTime desc, we collect all and sort,
    // or paginate. Let's filter in memory or fetch and filter, since Convex
    // queries can be filtered using .filter().
    const allTrades = await tradesQuery
      .collect();

    // In-memory filter, sorting and paginating to make robust filters easy
    let filtered = allTrades.filter((t) => accountIds.includes(t.accountId));

    if (args.state === "open" || args.state === "closed") {
      filtered = filtered.filter((t) => t.state === args.state);
    }

    if (args.symbol) {
      const symUpper = args.symbol.toUpperCase();
      filtered = filtered.filter((t) => t.symbol.toUpperCase().includes(symUpper));
    }

    // Sort by openTime desc
    filtered.sort((a, b) => b.openTime - a.openTime);

    // Manual page slice based on paginator options
    const page = args.paginationOpts.page || 1;
    const pageSize = args.paginationOpts.pageSize || 25;
    const total = filtered.length;
    const paginatedItems = filtered.slice((page - 1) * pageSize, page * pageSize);

    const items = await Promise.all(paginatedItems.map((t) => formatTradeDto(ctx, t)));

    return {
      total,
      page,
      pageSize,
      items,
    };
  },
});

// Get a single trade details
export const get = query({
  args: {
    token: v.string(),
    id: v.id("trades"),
  },
  handler: async (ctx, args) => {
    const user = await getSessionUser(ctx, args.token);
    if (!user) throw new Error("Unauthorized");

    const trade = await ctx.db.get(args.id);
    if (!trade) throw new Error("Trade not found");

    const account = await ctx.db.get(trade.accountId);
    if (!account || account.userId !== user._id) {
      throw new Error("Trade not found");
    }

    return await formatTradeDto(ctx, trade);
  },
});

// Upsert trade notes
export const upsertNote = mutation({
  args: {
    token: v.string(),
    tradeId: v.id("trades"),
    note: v.union(v.string(), v.null()),
    strategy: v.union(v.string(), v.null()),
    setup: v.union(v.string(), v.null()),
    tags: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getSessionUser(ctx, args.token);
    if (!user) throw new Error("Unauthorized");

    const trade = await ctx.db.get(args.tradeId);
    if (!trade) throw new Error("Trade not found");

    const account = await ctx.db.get(trade.accountId);
    if (!account || account.userId !== user._id) {
      throw new Error("Trade not found");
    }

    const existingNote = await ctx.db
      .query("tradeNotes")
      .withIndex("by_tradeId", (q) => q.eq("tradeId", trade._id))
      .unique();

    const data = {
      tradeId: trade._id,
      note: args.note ?? undefined,
      strategy: args.strategy ?? undefined,
      setup: args.setup ?? undefined,
      tags: args.tags,
    };

    if (existingNote) {
      await ctx.db.patch(existingNote._id, data);
    } else {
      await ctx.db.insert("tradeNotes", data);
    }

    return await formatTradeDto(ctx, trade);
  },
});
