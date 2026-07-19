import { DealPayload, OpenPositionPayload } from "../../packages/shared/src/index";

export interface AggregatedTrade {
  ticket: number;
  symbol: string;
  direction: "buy" | "sell";
  state: "open" | "closed";
  volume: number;
  entryPrice: number;
  exitPrice: number | null;
  sl: number | null;
  tp: number | null;
  openTime: number; // Unix epoch ms
  closeTime: number | null; // Unix epoch ms
  commission: number;
  swap: number;
  profit: number;
  netProfit: number;
  pips: number | null;
  rr: number | null;
  durationSec: number | null;
  digits: number;
  point: number;
}

const EPS = 1e-8;

export function pipSize(digits: number, point: number): number {
  return digits === 5 || digits === 3 ? point * 10 : point;
}

export function brokerTimeToUtc(unixSeconds: number, utcOffsetMinutes: number): number {
  return (unixSeconds - utcOffsetMinutes * 60) * 1000;
}

function vwap(fills: { price: number; volume: number }[]): number {
  const vol = fills.reduce((s, f) => s + f.volume, 0);
  if (vol < EPS) return 0;
  return fills.reduce((s, f) => s + f.price * f.volume, 0) / vol;
}

function round(value: number, decimals: number): number {
  const f = 10 ** decimals;
  return Math.round(value * f) / f;
}

export function aggregatePosition(
  deals: DealPayload[],
  utcOffsetMinutes: number,
): AggregatedTrade | null {
  const fills = [...deals].sort((a, b) => a.time - b.time || a.ticket - b.ticket);
  const ins = fills.filter((d) => d.entry === "in");
  const outs = fills.filter(
    (d) => d.entry === "out" || d.entry === "out_by" || d.entry === "inout",
  );
  if (ins.length === 0) return null;

  const inVolume = ins.reduce((s, d) => s + d.volume, 0);
  const outVolume = Math.min(
    outs.reduce((s, d) => s + d.volume, 0),
    inVolume,
  );
  const closed = inVolume - outVolume < EPS;

  const direction = ins[0].type;
  const dirSign = direction === "buy" ? 1 : -1;
  const digits = ins[0].digits;
  const point = ins[0].point;

  const entryPrice = round(vwap(ins), digits);
  const exitPrice = outs.length > 0 ? round(vwap(outs), digits) : null;

  const commission = fills.reduce((s, d) => s + d.commission, 0);
  const swap = fills.reduce((s, d) => s + d.swap, 0);
  const profit = fills.reduce((s, d) => s + d.profit, 0);

  const sl = [...fills].reverse().find((d) => d.sl > 0)?.sl ?? null;
  const tp = [...fills].reverse().find((d) => d.tp > 0)?.tp ?? null;

  const openTime = brokerTimeToUtc(ins[0].time, utcOffsetMinutes);
  const closeTime = closed
    ? brokerTimeToUtc(outs[outs.length - 1].time, utcOffsetMinutes)
    : null;

  let pips: number | null = null;
  let rr: number | null = null;
  if (closed && exitPrice != null) {
    pips = round(((exitPrice - entryPrice) * dirSign) / pipSize(digits, point), 1);
    if (sl != null && Math.abs(entryPrice - sl) > EPS) {
      rr = round(((exitPrice - entryPrice) * dirSign) / Math.abs(entryPrice - sl), 2);
    }
  }

  return {
    ticket: fills[0].positionId,
    symbol: ins[0].symbol,
    direction,
    state: closed ? "closed" : "open",
    volume: round(inVolume, 2),
    entryPrice,
    exitPrice: closed ? exitPrice : null,
    sl,
    tp,
    openTime,
    closeTime,
    commission: round(commission, 2),
    swap: round(swap, 2),
    profit: round(profit, 2),
    netProfit: round(profit + commission + swap, 2),
    pips,
    rr,
    durationSec: closeTime ? Math.max(0, Math.round((closeTime - openTime) / 1000)) : null,
    digits,
    point,
  };
}

export function openPositionToTrade(
  pos: OpenPositionPayload,
  utcOffsetMinutes: number,
): AggregatedTrade {
  return {
    ticket: pos.positionId,
    symbol: pos.symbol,
    direction: pos.type,
    state: "open",
    volume: round(pos.volume, 2),
    entryPrice: pos.openPrice,
    exitPrice: null,
    sl: pos.sl > 0 ? pos.sl : null,
    tp: pos.tp > 0 ? pos.tp : null,
    openTime: brokerTimeToUtc(pos.openTime, utcOffsetMinutes),
    closeTime: null,
    commission: 0,
    swap: round(pos.swap, 2),
    profit: round(pos.profit, 2),
    netProfit: round(pos.profit + pos.swap, 2),
    pips: null,
    rr: null,
    durationSec: null,
    digits: pos.digits,
    point: pos.point,
  };
}
