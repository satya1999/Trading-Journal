import {
  AnalyticsBreakdown,
  BucketStat,
  Insight,
  SymbolStat,
} from "@trademind/shared";

export interface ClosedTradeRow {
  symbol: string;
  netProfit: number;
  rr: number | null;
  sl: number | null;
  openTime: Date;
  closeTime: Date;
}

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MIN_SAMPLE = 5; // never draw a conclusion from fewer trades than this

const round2 = (n: number) => Math.round(n * 100) / 100;
const money = (n: number) =>
  (n < 0 ? "-$" : "$") + Math.abs(n).toFixed(Math.abs(n) >= 100 ? 0 : 2);

/** Pure computation: closed trades -> buckets, distributions, and rule-based
 *  coaching insights. Deterministic so it is unit-testable; the AI coach in
 *  Milestone 2 will build on the same aggregates. */
export function computeBreakdown(trades: ClosedTradeRow[]): AnalyticsBreakdown {
  const byHour: BucketStat[] = Array.from({ length: 24 }, (_, h) => ({
    key: String(h).padStart(2, "0"),
    pnl: 0,
    trades: 0,
    wins: 0,
  }));
  const byWeekday: BucketStat[] = WEEKDAYS.map((key) => ({
    key,
    pnl: 0,
    trades: 0,
    wins: 0,
  }));
  const symbolMap = new Map<string, SymbolStat & { rrSum: number; rrN: number }>();

  const rrBuckets = ["≤-2", "-2…-1", "-1…0", "0…1", "1…2", "2…3", "3+"];
  const rrCounts = new Array(rrBuckets.length).fill(0);
  let noSl = 0;

  for (const t of trades) {
    const hour = t.openTime.getUTCHours();
    byHour[hour].pnl = round2(byHour[hour].pnl + t.netProfit);
    byHour[hour].trades++;
    if (t.netProfit > 0) byHour[hour].wins++;

    const wd = (t.openTime.getUTCDay() + 6) % 7; // Monday-first
    byWeekday[wd].pnl = round2(byWeekday[wd].pnl + t.netProfit);
    byWeekday[wd].trades++;
    if (t.netProfit > 0) byWeekday[wd].wins++;

    const s =
      symbolMap.get(t.symbol) ??
      { symbol: t.symbol, pnl: 0, trades: 0, wins: 0, avgRR: null, rrSum: 0, rrN: 0 };
    s.pnl = round2(s.pnl + t.netProfit);
    s.trades++;
    if (t.netProfit > 0) s.wins++;
    if (t.rr != null) {
      s.rrSum += t.rr;
      s.rrN++;
    }
    symbolMap.set(t.symbol, s);

    if (t.sl == null) noSl++;
    if (t.rr != null) {
      const r = t.rr;
      const idx =
        r <= -2 ? 0 : r < -1 ? 1 : r < 0 ? 2 : r < 1 ? 3 : r < 2 ? 4 : r < 3 ? 5 : 6;
      rrCounts[idx]++;
    }
  }

  const bySymbol = [...symbolMap.values()]
    .map(({ rrSum, rrN, ...s }) => ({
      ...s,
      avgRR: rrN > 0 ? round2(rrSum / rrN) : null,
    }))
    .sort((a, b) => Math.abs(b.pnl) - Math.abs(a.pnl));

  const wins = trades.filter((t) => t.netProfit > 0);
  const losses = trades.filter((t) => t.netProfit < 0);
  const avgWin = wins.length
    ? round2(wins.reduce((s, t) => s + t.netProfit, 0) / wins.length)
    : null;
  const avgLoss = losses.length
    ? round2(Math.abs(losses.reduce((s, t) => s + t.netProfit, 0) / losses.length))
    : null;
  const expectancy = trades.length
    ? round2(trades.reduce((s, t) => s + t.netProfit, 0) / trades.length)
    : null;
  const noSlPct = trades.length ? round2((noSl / trades.length) * 100) : null;

  return {
    closedTrades: trades.length,
    byHour,
    byWeekday,
    bySymbol,
    bySession: [],
    byStrategy: [],
    bySetup: [],
    byDuration: [],
    heatmap: [],
    streaks: { maxWinStreak: 0, maxLossStreak: 0, currentStreak: 0 },
    rrHistogram: rrBuckets.map((bucket, i) => ({ bucket, count: rrCounts[i] })),
    avgWin,
    avgLoss,
    expectancy,
    noSlPct,
    insights: buildInsights(trades, {
      byHour,
      byWeekday,
      bySymbol,
      avgWin,
      avgLoss,
      expectancy,
      noSlPct,
    }),
  };
}

function buildInsights(
  trades: ClosedTradeRow[],
  agg: {
    byHour: BucketStat[];
    byWeekday: BucketStat[];
    bySymbol: SymbolStat[];
    avgWin: number | null;
    avgLoss: number | null;
    expectancy: number | null;
    noSlPct: number | null;
  },
): Insight[] {
  const out: Insight[] = [];
  if (trades.length < MIN_SAMPLE) {
    out.push({
      tone: "info",
      title: "Keep trading — insights unlock as data grows",
      body: `Only ${trades.length} closed trade${trades.length === 1 ? "" : "s"} so far. Patterns need at least ${MIN_SAMPLE} trades per category to be worth acting on.`,
    });
    return out;
  }

  // Risk/reward asymmetry — the most common account-killer.
  if (agg.avgWin != null && agg.avgLoss != null && agg.avgLoss > agg.avgWin * 1.3) {
    out.push({
      tone: "critical",
      title: "Your average loss dwarfs your average win",
      body: `Average loss ${money(agg.avgLoss)} vs average win ${money(agg.avgWin)} (${(agg.avgLoss / agg.avgWin).toFixed(1)}×). Cutting losers at 1R or tightening stops would flip this — no win-rate improvement needed.`,
    });
  }

  // Missing stop losses.
  if (agg.noSlPct != null && agg.noSlPct >= 30) {
    out.push({
      tone: "warning",
      title: `${agg.noSlPct.toFixed(0)}% of trades had no stop loss`,
      body: "Without a stop, R-multiples can't be measured and a single trade can undo weeks. Place a hard SL before entry — your R distribution chart stays honest that way.",
    });
  }

  // Worst weekday.
  const badDay = agg.byWeekday
    .filter((d) => d.trades >= MIN_SAMPLE && d.pnl < 0)
    .sort((a, b) => a.pnl - b.pnl)[0];
  if (badDay) {
    out.push({
      tone: "warning",
      title: `${badDay.key} is your leak`,
      body: `${badDay.trades} trades on ${badDay.key}s netted ${money(badDay.pnl)} (${((badDay.wins / badDay.trades) * 100).toFixed(0)}% win rate). Consider sitting ${badDay.key}s out for a month and compare.`,
    });
  }

  // Worst symbol.
  const badSym = agg.bySymbol
    .filter((s) => s.trades >= MIN_SAMPLE && s.pnl < 0)
    .sort((a, b) => a.pnl - b.pnl)[0];
  if (badSym) {
    out.push({
      tone: "warning",
      title: `${badSym.symbol} is costing you money`,
      body: `${badSym.trades} trades, ${money(badSym.pnl)} net, ${((badSym.wins / badSym.trades) * 100).toFixed(0)}% win rate. Either shrink size on ${badSym.symbol} or study what differs from your profitable symbols.`,
    });
  }

  // Best symbol / edge.
  const goodSym = agg.bySymbol
    .filter((s) => s.trades >= MIN_SAMPLE && s.pnl > 0)
    .sort((a, b) => b.pnl - a.pnl)[0];
  if (goodSym) {
    out.push({
      tone: "good",
      title: `Your edge lives on ${goodSym.symbol}`,
      body: `${money(goodSym.pnl)} over ${goodSym.trades} trades (${((goodSym.wins / goodSym.trades) * 100).toFixed(0)}% win rate${goodSym.avgRR != null ? `, avg ${goodSym.avgRR}R` : ""}). Leaning into your best market usually beats fixing the worst one.`,
    });
  }

  // Best hours window (3h sliding window over hours with enough activity).
  const hours = agg.byHour;
  let best: { start: number; pnl: number; trades: number } | null = null;
  for (let h = 0; h < 24; h++) {
    const win = [hours[h], hours[(h + 1) % 24], hours[(h + 2) % 24]];
    const trades3 = win.reduce((s, x) => s + x.trades, 0);
    const pnl3 = win.reduce((s, x) => s + x.pnl, 0);
    if (trades3 >= MIN_SAMPLE && (best == null || pnl3 > best.pnl)) {
      best = { start: h, pnl: round2(pnl3), trades: trades3 };
    }
  }
  if (best && best.pnl > 0) {
    const label = `${String(best.start).padStart(2, "0")}:00–${String((best.start + 3) % 24).padStart(2, "0")}:00 UTC`;
    out.push({
      tone: "info",
      title: `Your golden window: ${label}`,
      body: `${money(best.pnl)} across ${best.trades} trades opened in this window. Concentrating your trading (and attention) here is a free performance upgrade.`,
    });
  }

  // Overtrading: busy days vs calm days.
  const byDate = new Map<string, { pnl: number; n: number }>();
  for (const t of trades) {
    const d = t.closeTime.toISOString().slice(0, 10);
    const e = byDate.get(d) ?? { pnl: 0, n: 0 };
    e.pnl += t.netProfit;
    e.n++;
    byDate.set(d, e);
  }
  const busy = [...byDate.values()].filter((d) => d.n > 5);
  const calm = [...byDate.values()].filter((d) => d.n >= 1 && d.n <= 5);
  if (busy.length >= 3 && calm.length >= 3) {
    const busyAvg = busy.reduce((s, d) => s + d.pnl, 0) / busy.length;
    const calmAvg = calm.reduce((s, d) => s + d.pnl, 0) / calm.length;
    if (busyAvg < 0 && calmAvg > busyAvg) {
      out.push({
        tone: "warning",
        title: "High-frequency days underperform",
        body: `Days with more than 5 trades average ${money(round2(busyAvg))}, versus ${money(round2(calmAvg))} on calmer days. That gap is usually revenge trading or forced setups — cap your daily trade count.`,
      });
    }
  }

  // Overall health.
  if (agg.expectancy != null && agg.expectancy > 0 && out.every((i) => i.tone !== "critical")) {
    out.push({
      tone: "good",
      title: `Positive expectancy: ${money(agg.expectancy)} per trade`,
      body: `Across ${trades.length} closed trades your system makes money on average. Protect it: same risk per trade, and let the sample keep growing.`,
    });
  }

  const order = { critical: 0, warning: 1, info: 2, good: 3 };
  return out.sort((a, b) => order[a.tone] - order[b.tone]).slice(0, 6);
}
