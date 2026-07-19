#!/usr/bin/env node
// Replays realistic MT5 EA traffic (handshake -> deal batches -> heartbeats)
// against the TradeMind API, so the full pipeline can be exercised without a
// MetaTrader terminal. Payload shapes mirror packages/shared exactly.
//
//   node tools/ea-simulator/index.mjs --token tmk_xxx [--api http://localhost:4000]
//        [--trades 50] [--days 60] [--replay] [--open 2] [--seed 42]

const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, a, i, arr) => {
    if (a.startsWith("--")) acc.push([a.slice(2), arr[i + 1]?.startsWith("--") || arr[i + 1] === undefined ? "true" : arr[i + 1]]);
    return acc;
  }, []),
);

const API = args.api ?? "http://localhost:4000";
const TOKEN = args.token;
const N_TRADES = Number(args.trades ?? 50);
const DAYS = Number(args.days ?? 60);
const N_OPEN = Number(args.open ?? 2);
const REPLAY = args.replay === "true";

if (!TOKEN) {
  console.error("Usage: node tools/ea-simulator/index.mjs --token <sync-token> [--api url] [--trades n] [--replay]");
  process.exit(1);
}

// Deterministic PRNG so runs are reproducible with --seed
let seed = Number(args.seed ?? 1337);
const rand = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
const pick = (arr) => arr[Math.floor(rand() * arr.length)];

const SYMBOLS = [
  { symbol: "EURUSD", digits: 5, point: 0.00001, price: 1.085, vol: 0.004, pipValue: 10 },
  { symbol: "GBPUSD", digits: 5, point: 0.00001, price: 1.27, vol: 0.005, pipValue: 10 },
  { symbol: "USDJPY", digits: 3, point: 0.001, price: 155.2, vol: 0.4, pipValue: 6.5 },
  { symbol: "XAUUSD", digits: 2, point: 0.01, price: 2400, vol: 12, pipValue: 1 },
  { symbol: "NAS100", digits: 1, point: 0.1, price: 19800, vol: 90, pipValue: 0.1 },
];

const now = Math.floor(Date.now() / 1000);
const UTC_OFFSET_MIN = 120; // simulate a UTC+2 broker

let dealTicket = 1_000_000;
let positionId = 500_000;

function makeClosedTrade(openUnix) {
  const s = pick(SYMBOLS);
  const dir = rand() < 0.5 ? "buy" : "sell";
  const sign = dir === "buy" ? 1 : -1;
  const lots = Number((0.1 + rand() * 0.9).toFixed(2));
  const entry = Number((s.price * (1 + (rand() - 0.5) * 0.01)).toFixed(s.digits));
  const move = s.vol * (rand() * 2 - 0.85); // slight positive expectancy
  const exit = Number((entry + sign * move).toFixed(s.digits));
  const sl = Number((entry - sign * s.vol * (0.5 + rand())).toFixed(s.digits));
  const tp = Number((entry + sign * s.vol * (1 + rand() * 2)).toFixed(s.digits));
  const holdSec = Math.floor(600 + rand() * 6 * 3600);
  const profit = Number((((exit - entry) * sign) / s.point * s.pipValue * lots * (s.digits >= 3 ? 0.1 : 1)).toFixed(2));
  const pos = positionId++;
  const base = { symbol: s.symbol, digits: s.digits, point: s.point, sl, tp };

  const deals = [
    {
      ...base,
      ticket: dealTicket++,
      positionId: pos,
      orderTicket: dealTicket + 10_000,
      type: dir,
      entry: "in",
      volume: lots,
      price: entry,
      commission: Number((-3.5 * lots).toFixed(2)),
      swap: 0,
      profit: 0,
      time: openUnix,
    },
  ];

  // ~20% of trades close in two partial fills
  const partial = rand() < 0.2;
  if (partial) {
    const half = Number((lots / 2).toFixed(2));
    deals.push({
      ...base,
      ticket: dealTicket++,
      positionId: pos,
      orderTicket: dealTicket + 10_000,
      type: dir === "buy" ? "sell" : "buy",
      entry: "out",
      volume: half,
      price: exit,
      commission: 0,
      swap: 0,
      profit: Number((profit / 2).toFixed(2)),
      time: openUnix + Math.floor(holdSec / 2),
    });
    deals.push({
      ...base,
      ticket: dealTicket++,
      positionId: pos,
      orderTicket: dealTicket + 10_000,
      type: dir === "buy" ? "sell" : "buy",
      entry: "out",
      volume: Number((lots - half).toFixed(2)),
      price: exit,
      commission: 0,
      swap: Number((-0.8 * rand()).toFixed(2)),
      profit: Number((profit / 2).toFixed(2)),
      time: openUnix + holdSec,
    });
  } else {
    deals.push({
      ...base,
      ticket: dealTicket++,
      positionId: pos,
      orderTicket: dealTicket + 10_000,
      type: dir === "buy" ? "sell" : "buy",
      entry: "out",
      volume: lots,
      price: exit,
      commission: 0,
      swap: holdSec > 20 * 3600 ? Number((-1.2 * rand()).toFixed(2)) : 0,
      profit,
      time: openUnix + holdSec,
    });
  }
  return deals;
}

function makeOpenPosition() {
  const s = pick(SYMBOLS);
  const dir = rand() < 0.5 ? "buy" : "sell";
  const sign = dir === "buy" ? 1 : -1;
  const lots = Number((0.1 + rand() * 0.5).toFixed(2));
  const entry = Number((s.price * (1 + (rand() - 0.5) * 0.005)).toFixed(s.digits));
  const current = Number((entry + sign * s.vol * (rand() - 0.4)).toFixed(s.digits));
  return {
    positionId: positionId++,
    symbol: s.symbol,
    type: dir,
    volume: lots,
    openPrice: entry,
    sl: Number((entry - sign * s.vol).toFixed(s.digits)),
    tp: Number((entry + sign * s.vol * 2).toFixed(s.digits)),
    currentPrice: current,
    profit: Number((((current - entry) * sign) / s.point * lots).toFixed(2)),
    swap: 0,
    openTime: now - Math.floor(rand() * 3600 * 8),
    digits: s.digits,
    point: s.point,
  };
}

async function post(path, body) {
  const res = await fetch(API + path, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${TOKEN}`,
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) {
    console.error(`POST ${path} -> ${res.status}: ${text.slice(0, 300)}`);
    process.exit(1);
  }
  return text ? JSON.parse(text) : {};
}

async function main() {
  // 1. handshake
  const balance = 10_000;
  const hs = await post("/sync/handshake", {
    accountNumber: 88_123_456,
    broker: "TradeMind Demo Ltd",
    server: "TradeMindDemo-Server",
    currency: "USD",
    leverage: 100,
    balance,
    equity: balance,
    accountName: "Simulated Trader",
    utcOffsetMinutes: UTC_OFFSET_MIN,
  });
  console.log("handshake ok:", hs);

  // 2. generate history spread over the past DAYS (weekdays only)
  const allDeals = [];
  for (let i = 0; i < N_TRADES; i++) {
    let open = now - Math.floor(rand() * DAYS * 86400) - 12 * 3600;
    const d = new Date(open * 1000).getUTCDay();
    if (d === 0) open += 86400; // shift Sun -> Mon
    if (d === 6) open -= 86400; // shift Sat -> Fri
    allDeals.push(...makeClosedTrade(open));
  }
  allDeals.sort((a, b) => a.time - b.time || a.ticket - b.ticket);
  const openPositions = Array.from({ length: N_OPEN }, makeOpenPosition);

  const send = async (label) => {
    let stored = 0;
    for (let i = 0; i < allDeals.length; i += 200) {
      const batch = allDeals.slice(i, i + 200);
      const res = await post("/sync/deals", {
        deals: batch,
        openPositions: i + 200 >= allDeals.length ? openPositions : [],
      });
      stored += res.storedDeals;
    }
    console.log(`${label}: sent ${allDeals.length} deals, server stored ${stored} new`);
    return stored;
  };

  const first = await send("sync");
  if (REPLAY) {
    const second = await send("replay");
    if (second !== 0) {
      console.error(`IDEMPOTENCY FAIL: replay stored ${second} deals, expected 0`);
      process.exit(1);
    }
    console.log("idempotency ok: replay stored 0 new deals");
  }

  // 3. a few heartbeats
  const realized = allDeals.reduce((s, d) => s + d.profit + d.commission + d.swap, 0);
  for (let i = 0; i < 3; i++) {
    await post("/sync/heartbeat", {
      balance: Number((balance + realized).toFixed(2)),
      equity: Number((balance + realized + openPositions.reduce((s, p) => s + p.profit, 0)).toFixed(2)),
      margin: 350,
      freeMargin: Number((balance + realized - 350).toFixed(2)),
      openPositions: openPositions.length,
    });
  }
  console.log(`heartbeats ok (final balance ~${(balance + realized).toFixed(2)})`);
  console.log("done — open the dashboard to see the data.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
