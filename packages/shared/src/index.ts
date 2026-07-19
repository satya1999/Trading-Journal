import { z } from "zod";

// ---------------------------------------------------------------------------
// EA -> API sync protocol
//
// The MT5 Expert Advisor (ea/TradeMindSync.mq5) pushes these payloads over
// HTTPS with `Authorization: Bearer <sync-token>`. The ea-simulator replays
// the same shapes. Times are unix seconds in *broker server time*; the
// handshake carries the broker's UTC offset so the API can normalize.
// ---------------------------------------------------------------------------

export const handshakeSchema = z.object({
  accountNumber: z.number().int(),
  broker: z.string().min(1),
  server: z.string().min(1),
  currency: z.string().min(1),
  leverage: z.number().int().positive(),
  balance: z.number(),
  equity: z.number(),
  accountName: z.string().optional(),
  /** (broker server time - UTC) in minutes, from TimeTradeServer()-TimeGMT() */
  utcOffsetMinutes: z.number().int().default(0),
});
export type HandshakePayload = z.infer<typeof handshakeSchema>;

export interface HandshakeResponse {
  accountId: string;
  /** highest deal ticket already stored — EA resumes history sync after this */
  lastDealTicket: number;
}

export const heartbeatSchema = z.object({
  balance: z.number(),
  equity: z.number(),
  margin: z.number().default(0),
  freeMargin: z.number().default(0),
  openPositions: z.number().int().default(0),
});
export type HeartbeatPayload = z.infer<typeof heartbeatSchema>;

/** One MT5 deal (fill). Balance/credit operations are filtered out by the EA. */
export const dealSchema = z.object({
  ticket: z.number().int(),
  positionId: z.number().int(),
  orderTicket: z.number().int().default(0),
  symbol: z.string().min(1),
  type: z.enum(["buy", "sell"]),
  /** DEAL_ENTRY_*: in = opens/adds, out/out_by = closes, inout = reversal */
  entry: z.enum(["in", "out", "inout", "out_by"]),
  volume: z.number().positive(),
  price: z.number().positive(),
  sl: z.number().default(0),
  tp: z.number().default(0),
  commission: z.number().default(0),
  swap: z.number().default(0),
  profit: z.number().default(0),
  /** unix seconds, broker server time */
  time: z.number().int(),
  digits: z.number().int().default(5),
  point: z.number().positive().default(0.00001),
  comment: z.string().optional(),
  magic: z.number().int().optional(),
});
export type DealPayload = z.infer<typeof dealSchema>;

export const openPositionSchema = z.object({
  positionId: z.number().int(),
  symbol: z.string().min(1),
  type: z.enum(["buy", "sell"]),
  volume: z.number().positive(),
  openPrice: z.number().positive(),
  sl: z.number().default(0),
  tp: z.number().default(0),
  currentPrice: z.number().default(0),
  profit: z.number().default(0),
  swap: z.number().default(0),
  /** unix seconds, broker server time */
  openTime: z.number().int(),
  digits: z.number().int().default(5),
  point: z.number().positive().default(0.00001),
});
export type OpenPositionPayload = z.infer<typeof openPositionSchema>;

export const syncDealsSchema = z.object({
  deals: z.array(dealSchema).max(1000).default([]),
  openPositions: z.array(openPositionSchema).max(500).default([]),
});
export type SyncDealsPayload = z.infer<typeof syncDealsSchema>;

export interface SyncDealsResponse {
  storedDeals: number;
  upsertedTrades: number;
  lastDealTicket: number;
}

// ---------------------------------------------------------------------------
// API -> web DTOs
// ---------------------------------------------------------------------------

export type TradeState = "open" | "closed";
export type TradeDirection = "buy" | "sell";

export interface TradeDto {
  id: string;
  accountId: string;
  ticket: number;
  symbol: string;
  direction: TradeDirection;
  state: TradeState;
  volume: number;
  entryPrice: number;
  exitPrice: number | null;
  sl: number | null;
  tp: number | null;
  openTime: string; // ISO, UTC
  closeTime: string | null;
  commission: number;
  swap: number;
  profit: number;
  netProfit: number;
  pips: number | null;
  rr: number | null;
  durationSec: number | null;
  note: TradeNoteDto | null;
}

export interface TradeNoteDto {
  note: string | null;
  strategy: string | null;
  setup: string | null;
  tags: string[];
}

export interface TradingAccountDto {
  id: string;
  broker: string | null;
  server: string | null;
  accountNumber: number | null;
  currency: string;
  leverage: number | null;
  balance: number;
  equity: number;
  margin: number;
  status: "pending" | "online" | "offline";
  lastHeartbeatAt: string | null;
  createdAt: string;
}

export interface AnalyticsSummary {
  balance: number;
  equity: number;
  todayPnl: number;
  winRate: number | null;
  profitFactor: number | null;
  maxDrawdown: number | null;
  openTrades: number;
  closedTrades: number;
  netProfit: number;
  avgRR: number | null;
}

export interface EquityPoint {
  time: string; // ISO
  balance: number;
  equity: number;
}

export interface CalendarDay {
  date: string; // YYYY-MM-DD (UTC)
  pnl: number;
  trades: number;
  wins: number;
  losses: number;
}

// ---------------------------------------------------------------------------
// Analytics breakdown (the /analytics/breakdown endpoint)
// ---------------------------------------------------------------------------

export interface BucketStat {
  key: string; // "00".."23" (UTC hour) or "Mon".."Sun"
  pnl: number;
  trades: number;
  wins: number;
}

export interface SymbolStat {
  symbol: string;
  pnl: number;
  trades: number;
  wins: number;
  avgRR: number | null;
}

/** Session analytics: P/L bucketed by forex market session (UTC). */
export interface SessionStat {
  session: string; // "Asian" | "London" | "New York" | "Overlap (LDN/NY)" | "Off-hours"
  pnl: number;
  trades: number;
  wins: number;
  avgRR: number | null;
}

/** Strategy/setup performance: P/L per user-tagged strategy or setup. */
export interface StrategyStat {
  name: string;
  pnl: number;
  trades: number;
  wins: number;
  avgRR: number | null;
}

/** Holding time analysis: P/L bucketed by trade duration. */
export interface DurationBucketStat {
  bucket: string; // "Scalp (<5m)" | "Intraday (5m–4h)" | "Swing (4h–2d)" | "Position (2d+)"
  pnl: number;
  trades: number;
  wins: number;
  avgRR: number | null;
}

export interface Insight {
  tone: "good" | "info" | "warning" | "critical";
  title: string;
  body: string;
}

export interface AnalyticsBreakdown {
  closedTrades: number;
  byHour: BucketStat[];
  byWeekday: BucketStat[];
  bySymbol: SymbolStat[];
  bySession: SessionStat[];
  byStrategy: StrategyStat[];
  bySetup: StrategyStat[];
  byDuration: DurationBucketStat[];
  rrHistogram: { bucket: string; count: number }[];
  avgWin: number | null;
  avgLoss: number | null; // positive magnitude
  expectancy: number | null; // avg net P/L per closed trade
  noSlPct: number | null; // % of closed trades without a stop loss
  insights: Insight[];
}
