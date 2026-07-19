import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getSessionUser } from "./auth";

const ONLINE_WINDOW_MS = 90_000;

function formatAccountDto(a: any) {
  const online =
    a.lastHeartbeatAt != null &&
    Date.now() - a.lastHeartbeatAt < ONLINE_WINDOW_MS;
  return {
    id: a._id,
    broker: a.broker ?? null,
    server: a.server ?? null,
    accountNumber: a.accountNumber ?? null,
    currency: a.currency,
    leverage: a.leverage ?? null,
    balance: a.balance,
    equity: a.equity,
    margin: a.margin,
    status: a.lastHeartbeatAt == null ? "pending" : online ? "online" : "offline",
    lastHeartbeatAt: a.lastHeartbeatAt ? new Date(a.lastHeartbeatAt).toISOString() : null,
    createdAt: new Date(a._creationTime).toISOString(),
    label: a.label,
  };
}

// List all accounts owned by current user
export const list = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const user = await getSessionUser(ctx, args.token);
    if (!user) throw new Error("Unauthorized");

    const accounts = await ctx.db
      .query("tradingAccounts")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .collect();

    return accounts.map(formatAccountDto);
  },
});

// Get a single trading account details
export const get = query({
  args: {
    token: v.string(),
    id: v.id("tradingAccounts"),
  },
  handler: async (ctx, args) => {
    const user = await getSessionUser(ctx, args.token);
    if (!user) throw new Error("Unauthorized");

    const account = await ctx.db.get(args.id);
    if (!account || account.userId !== user._id) {
      throw new Error("Trading account not found");
    }

    return formatAccountDto(account);
  },
});

// Insert a new trading account (called by Action)
export const insertAccount = mutation({
  args: {
    token: v.string(),
    label: v.string(),
    syncTokenHash: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getSessionUser(ctx, args.token);
    if (!user) throw new Error("Unauthorized");

    const accountId = await ctx.db.insert("tradingAccounts", {
      userId: user._id,
      label: args.label || "My MT5 Account",
      currency: "USD",
      balance: 0,
      equity: 0,
      margin: 0,
      freeMargin: 0,
      utcOffsetMinutes: 0,
      syncTokenHash: args.syncTokenHash,
      lastDealTicket: 0,
    });

    const account = await ctx.db.get(accountId);
    return formatAccountDto(account);
  },
});

// Update the sync token hash (called by Action)
export const updateTokenHash = mutation({
  args: {
    token: v.string(),
    id: v.id("tradingAccounts"),
    syncTokenHash: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getSessionUser(ctx, args.token);
    if (!user) throw new Error("Unauthorized");

    const account = await ctx.db.get(args.id);
    if (!account || account.userId !== user._id) {
      throw new Error("Trading account not found");
    }

    await ctx.db.patch(account._id, { syncTokenHash: args.syncTokenHash });
    return { success: true };
  },
});

// Remove trading account and all its child objects cascades
export const remove = mutation({
  args: {
    token: v.string(),
    id: v.id("tradingAccounts"),
  },
  handler: async (ctx, args) => {
    const user = await getSessionUser(ctx, args.token);
    if (!user) throw new Error("Unauthorized");

    const account = await ctx.db.get(args.id);
    if (!account || account.userId !== user._id) {
      throw new Error("Trading account not found");
    }

    // Delete cascading items
    // 1. Trades
    const trades = await ctx.db
      .query("trades")
      .withIndex("by_account_ticket", (q) => q.eq("accountId", account._id))
      .collect();
    for (const t of trades) {
      // Notes
      const notes = await ctx.db
        .query("tradeNotes")
        .withIndex("by_tradeId", (q) => q.eq("tradeId", t._id))
        .collect();
      for (const n of notes) {
        await ctx.db.delete(n._id);
      }
      await ctx.db.delete(t._id);
    }

    // 2. Raw Deals
    const rawDeals = await ctx.db
      .query("rawDeals")
      .withIndex("by_account_ticket", (q) => q.eq("accountId", account._id))
      .collect();
    for (const r of rawDeals) {
      await ctx.db.delete(r._id);
    }

    // 3. Snapshots
    const snapshots = await ctx.db
      .query("accountSnapshots")
      .withIndex("by_account_at", (q) => q.eq("accountId", account._id))
      .collect();
    for (const s of snapshots) {
      await ctx.db.delete(s._id);
    }

    // 4. Delete the account itself
    await ctx.db.delete(account._id);

    return { deleted: true };
  },
});
