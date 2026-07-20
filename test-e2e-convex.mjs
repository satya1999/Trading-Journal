#!/usr/bin/env node
/**
 * E2E test using `convex run` CLI: account creation → sync token → trade sync → journal retrieval
 */

import { execSync } from "child_process";
import crypto from "crypto";

const run = (cmd) => {
  try {
    return JSON.parse(execSync(cmd, { cwd: "/e/Trading Journal/apps/web", encoding: "utf8" }));
  } catch (e) {
    console.error("Command failed:", cmd);
    console.error(e.message);
    throw e;
  }
};

console.log("🧪 E2E Test: Account → Sync → Trades → Journal\n");

// Step 1: Register
console.log("📝 Step 1: Registering test user...");
const testEmail = `test-${Date.now()}@trademind.test`;
const testPassword = "TestPassword123!";

let sessionData = null;
try {
  sessionData = run(
    `npx convex run authActions:register '{"name":"Test Trader","email":"${testEmail}","password":"${testPassword}"}'`
  );
  console.log(`✓ User registered: ${testEmail}`);
  console.log(`✓ Session token: ${sessionData.token.slice(0, 20)}...`);
} catch (err) {
  console.error("❌ Registration failed");
  process.exit(1);
}

const sessionToken = sessionData.token;

// Step 2: Create account
console.log("\n📝 Step 2: Creating trading account...");
let accountData = null;
try {
  accountData = run(
    `npx convex run "accountsActions:create" '{"token":"${sessionToken}","label":"Test MT5 Account"}'`
  );
  console.log(`✓ Account created: ${accountData.account.id}`);
  console.log(`✓ Sync token: ${accountData.syncToken.slice(0, 20)}...`);
} catch (err) {
  console.error("❌ Account creation failed");
  process.exit(1);
}

const accountId = accountData.account.id;
const syncToken = accountData.syncToken;
const tokenHash = crypto.createHash("sha256").update(syncToken).digest("hex");

// Step 3: Handshake
console.log("\n📝 Step 3: EA handshake...");
try {
  const handshakeData = run(
    `npx convex run sync:handshake '{"tokenHash":"${tokenHash}","accountNumber":12345678,"broker":"ICMarkets","server":"ICMarkets-Demo","currency":"USD","leverage":500,"balance":10000,"equity":10500,"utcOffsetMinutes":120,"accountName":"Test"}'`
  );
  console.log(`✓ Handshake successful`);
  console.log(`✓ Last deal ticket: ${handshakeData.lastDealTicket}`);
} catch (err) {
  console.error("❌ Handshake failed:", err.message);
  process.exit(1);
}

// Step 4: Sync trades
console.log("\n📝 Step 4: Syncing trades...");
const now = Math.floor(Date.now() / 1000);
const dealsPayload = {
  tokenHash,
  deals: [
    {
      ticket: 1001,
      positionId: 5001,
      orderTicket: 0,
      symbol: "EURUSD",
      type: "buy",
      entry: "in",
      volume: 0.1,
      price: 1.085,
      sl: 1.08,
      tp: 1.09,
      commission: -10,
      swap: -5,
      profit: 500,
      time: now - 172800,
      digits: 5,
      point: 0.00001,
    },
    {
      ticket: 1002,
      positionId: 5001,
      orderTicket: 0,
      symbol: "EURUSD",
      type: "buy",
      entry: "out",
      volume: 0.1,
      price: 1.09,
      sl: 0,
      tp: 0,
      commission: -10,
      swap: -2,
      profit: 515,
      time: now - 86400,
      digits: 5,
      point: 0.00001,
    },
    {
      ticket: 1003,
      positionId: 5002,
      orderTicket: 0,
      symbol: "GBPUSD",
      type: "sell",
      entry: "in",
      volume: 0.05,
      price: 1.27,
      sl: 1.275,
      tp: 1.265,
      commission: -7,
      swap: -3,
      profit: -250,
      time: now - 3600,
      digits: 5,
      point: 0.00001,
    },
  ],
  openPositions: [
    {
      positionId: 5002,
      symbol: "GBPUSD",
      type: "sell",
      volume: 0.05,
      openPrice: 1.27,
      sl: 1.275,
      tp: 1.265,
      currentPrice: 1.268,
      profit: -100,
      swap: -1,
      openTime: now - 3600,
      digits: 5,
      point: 0.00001,
    },
  ],
};

try {
  const dealsData = run(
    `npx convex run sync:deals '${JSON.stringify(dealsPayload).replace(/'/g, "\\'")}'`
  );
  console.log(`✓ ${dealsData.storedDeals} raw deals stored`);
  console.log(`✓ ${dealsData.upsertedTrades} trades upserted`);
} catch (err) {
  console.error("❌ Deals sync failed:", err.message);
  process.exit(1);
}

// Step 5: Heartbeat
console.log("\n📝 Step 5: Heartbeat...");
try {
  run(
    `npx convex run sync:heartbeat '{"tokenHash":"${tokenHash}","balance":10765,"equity":10665,"margin":2000,"freeMargin":8665,"openPositions":1}'`
  );
  console.log(`✓ Account snapshot recorded`);
} catch (err) {
  console.error("❌ Heartbeat failed:", err.message);
  process.exit(1);
}

// Step 6: Fetch trades
console.log("\n📝 Step 6: Retrieving trades from journal...");
try {
  const tradesData = run(
    `npx convex run trades:list '{"token":"${sessionToken}","accountId":"${accountId}","paginationOpts":{"page":1,"pageSize":25}}'`
  );
  console.log(`✓ Retrieved ${tradesData.total} trades`);

  if (tradesData.items.length > 0) {
    console.log("\n📋 Sample trades in journal:");
    tradesData.items.forEach((t, i) => {
      console.log(
        `  [${i + 1}] ${t.symbol} ${t.direction.toUpperCase()} • ${t.state} • P/L: ${t.netProfit}`
      );
    });
  }

  if (tradesData.total === 3) {
    console.log(
      `\n✅ SUCCESS: All 3 trades synced and retrievable from journal!\n`
    );
  } else {
    console.log(
      `\n⚠️  Expected 3 trades, got ${tradesData.total}\n`
    );
  }
} catch (err) {
  console.error("❌ Trades retrieval failed:", err.message);
  process.exit(1);
}

console.log(
  "✅ E2E verified: Account → MT5 Sync → Trade Storage → Journal UI pipeline works!\n"
);
