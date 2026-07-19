import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Users (for auth)
  users: defineTable({
    name: v.string(),
    email: v.string(),
    passwordHash: v.string(), // Simple secure password auth for serverless demo
    plan: v.string(), // "free" | "pro"
  }).index("by_email", ["email"]),

  // Session tokens for authenticated users
  sessions: defineTable({
    userId: v.id("users"),
    token: v.string(),
    expiresAt: v.number(),
  }).index("by_token", ["token"]),

  // Trading Accounts
  tradingAccounts: defineTable({
    userId: v.id("users"),
    label: v.string(),
    broker: v.optional(v.string()),
    server: v.optional(v.string()),
    accountNumber: v.optional(v.number()),
    currency: v.string(),
    leverage: v.optional(v.number()),
    balance: v.number(),
    equity: v.number(),
    margin: v.number(),
    freeMargin: v.number(),
    utcOffsetMinutes: v.number(),
    syncTokenHash: v.string(),
    lastHeartbeatAt: v.optional(v.number()),
    lastDealTicket: v.number(), // Highest ticket synced
  })
    .index("by_userId", ["userId"])
    .index("by_syncTokenHash", ["syncTokenHash"]),

  // Aggregated Trades (positions)
  trades: defineTable({
    accountId: v.id("tradingAccounts"),
    ticket: v.number(), // MT5 position identifier
    symbol: v.string(),
    direction: v.string(), // "buy" | "sell"
    state: v.string(), // "open" | "closed"
    volume: v.number(),
    entryPrice: v.number(),
    exitPrice: v.optional(v.number()),
    sl: v.optional(v.number()),
    tp: v.optional(v.number()),
    openTime: v.number(), // UTC timestamp ms
    closeTime: v.optional(v.number()), // UTC timestamp ms
    commission: v.number(),
    swap: v.number(),
    profit: v.number(),
    netProfit: v.number(),
    pips: v.optional(v.number()),
    rr: v.optional(v.number()),
    durationSec: v.optional(v.number()),
    digits: v.number(),
    point: v.number(),
  })
    .index("by_account_ticket", ["accountId", "ticket"])
    .index("by_account_state", ["accountId", "state"])
    .index("by_account_closeTime", ["accountId", "closeTime"])
    .index("by_account_symbol", ["accountId", "symbol"]),

  // Raw deal fills for recomputing trades
  rawDeals: defineTable({
    accountId: v.id("tradingAccounts"),
    ticket: v.number(), // deal ticket
    positionId: v.number(),
    time: v.number(), // UTC timestamp ms
    payload: v.any(), // verbatim MT5 details
  })
    .index("by_account_ticket", ["accountId", "ticket"])
    .index("by_account_positionId", ["accountId", "positionId"]),

  // Historical heartbeats for the equity curve
  accountSnapshots: defineTable({
    accountId: v.id("tradingAccounts"),
    balance: v.number(),
    equity: v.number(),
    margin: v.number(),
    freeMargin: v.number(),
    at: v.number(), // timestamp ms
  }).index("by_account_at", ["accountId", "at"]),

  // User-submitted trade journal notes
  tradeNotes: defineTable({
    tradeId: v.id("trades"),
    note: v.optional(v.string()),
    strategy: v.optional(v.string()),
    setup: v.optional(v.string()),
    tags: v.array(v.string()),
  }).index("by_tradeId", ["tradeId"]),
});
