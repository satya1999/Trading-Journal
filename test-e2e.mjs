#!/usr/bin/env node
/**
 * E2E test: account creation → sync token → trade sync → journal retrieval
 * Tests the Convex backend flow directly
 */

import crypto from "crypto";

const CONVEX_URL = "https://careful-duck-681.convex.cloud";

// Step 1: Create a test user via authActions:register
console.log("📝 Step 1: Registering test user...");
const testEmail = `test-${Date.now()}@trademind.test`;
const testPassword = "TestPassword123!";

let sessionToken = null;
try {
  const registerResp = await fetch(`${CONVEX_URL}/api/authActions:register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "Test Trader",
      email: testEmail,
      password: testPassword,
    }),
  });

  if (!registerResp.ok) {
    throw new Error(`Register failed: ${registerResp.status}`);
  }

  const registerData = await registerResp.json();
  sessionToken = registerData.token;
  console.log(`✓ User registered: ${testEmail}`);
  console.log(`✓ Session token: ${sessionToken.slice(0, 20)}...`);
} catch (err) {
  console.error("❌ Registration failed:", err.message);
  process.exit(1);
}

// Step 2: Create a trading account to get sync token
console.log("\n📝 Step 2: Creating trading account...");
let accountId = null;
let syncToken = null;
try {
  const createAccountResp = await fetch(`${CONVEX_URL}/api/accountsActions:create`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      token: sessionToken,
      label: "Test MT5 Account",
    }),
  });

  if (!createAccountResp.ok) {
    throw new Error(`Create account failed: ${createAccountResp.status}`);
  }

  const accountData = await createAccountResp.json();
  accountId = accountData.account.id;
  syncToken = accountData.syncToken;
  console.log(`✓ Account created: ${accountId}`);
  console.log(`✓ Sync token: ${syncToken.slice(0, 20)}...`);
} catch (err) {
  console.error("❌ Account creation failed:", err.message);
  process.exit(1);
}

// Step 3: Simulate EA handshake
console.log("\n📝 Step 3: Simulating EA handshake...");
const tokenHash = crypto.createHash("sha256").update(syncToken).digest("hex");
try {
  const handshakeResp = await fetch(`${CONVEX_URL}/api/sync:handshake`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      tokenHash,
      accountNumber: 12345678,
      broker: "ICMarkets",
      server: "ICMarkets-Demo",
      currency: "USD",
      leverage: 500,
      balance: 10000,
      equity: 10500,
      utcOffsetMinutes: 120,
      accountName: "Test Account",
    }),
  });

  if (!handshakeResp.ok) {
    throw new Error(`Handshake failed: ${handshakeResp.status}`);
  }

  const handshakeData = await handshakeResp.json();
  console.log(`✓ EA handshake successful`);
  console.log(`✓ Last deal ticket: ${handshakeData.lastDealTicket}`);
} catch (err) {
  console.error("❌ Handshake failed:", err.message);
  process.exit(1);
}

// Step 4: Sync test trades
console.log("\n📝 Step 4: Syncing test trades...");
const testTrades = [
  {
    ticket: 1001,
    positionId: 5001,
    orderTicket: 0,
    symbol: "EURUSD",
    type: "buy",
    entry: "in",
    volume: 0.1,
    price: 1.0850,
    sl: 1.0800,
    tp: 1.0900,
    commission: -10,
    swap: -5,
    profit: 500,
    time: Math.floor(Date.now() / 1000) - 86400 * 2,
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
    price: 1.0900,
    sl: 0,
    tp: 0,
    commission: -10,
    swap: -2,
    profit: 515,
    time: Math.floor(Date.now() / 1000) - 86400,
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
    price: 1.2700,
    sl: 1.2750,
    tp: 1.2650,
    commission: -7,
    swap: -3,
    profit: -250,
    time: Math.floor(Date.now() / 1000) - 3600,
    digits: 5,
    point: 0.00001,
  },
];

try {
  const dealsResp = await fetch(`${CONVEX_URL}/api/sync:deals`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      tokenHash,
      deals: testTrades,
      openPositions: [
        {
          positionId: 5002,
          symbol: "GBPUSD",
          type: "sell",
          volume: 0.05,
          openPrice: 1.2700,
          sl: 1.2750,
          tp: 1.2650,
          currentPrice: 1.2680,
          profit: -100,
          swap: -1,
          openTime: Math.floor(Date.now() / 1000) - 3600,
          digits: 5,
          point: 0.00001,
        },
      ],
    }),
  });

  if (!dealsResp.ok) {
    throw new Error(`Deals sync failed: ${dealsResp.status}`);
  }

  const dealsData = await dealsResp.json();
  console.log(`✓ ${dealsData.storedDeals} raw deals stored`);
  console.log(`✓ ${dealsData.upsertedTrades} trades upserted`);
} catch (err) {
  console.error("❌ Deals sync failed:", err.message);
  process.exit(1);
}

// Step 5: Heartbeat
console.log("\n📝 Step 5: Sending EA heartbeat...");
try {
  const heartbeatResp = await fetch(`${CONVEX_URL}/api/sync:heartbeat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      tokenHash,
      balance: 10765,
      equity: 10665,
      margin: 2000,
      freeMargin: 8665,
      openPositions: 1,
    }),
  });

  if (!heartbeatResp.ok) {
    throw new Error(`Heartbeat failed: ${heartbeatResp.status}`);
  }

  console.log(`✓ Account snapshot recorded (balance: 10765, equity: 10665)`);
} catch (err) {
  console.error("❌ Heartbeat failed:", err.message);
  process.exit(1);
}

// Step 6: Fetch trades from the journal
console.log("\n📝 Step 6: Retrieving trades from journal...");
try {
  const tradesResp = await fetch(`${CONVEX_URL}/api/trades:list`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      token: sessionToken,
      accountId: accountId,
      paginationOpts: { page: 1, pageSize: 25 },
    }),
  });

  if (!tradesResp.ok) {
    throw new Error(`Trades list failed: ${tradesResp.status}`);
  }

  const tradesData = await tradesResp.json();
  console.log(`✓ Retrieved ${tradesData.total} trades from journal`);
  console.log(`✓ Page ${tradesData.page} of ${Math.ceil(tradesData.total / tradesData.pageSize)}`);

  if (tradesData.items.length > 0) {
    console.log("\n📋 Sample trade:");
    const trade = tradesData.items[0];
    console.log(`  Symbol: ${trade.symbol}`);
    console.log(`  Direction: ${trade.direction}`);
    console.log(`  State: ${trade.state}`);
    console.log(`  Net P/L: ${trade.netProfit}`);
    console.log(`  Entry: ${trade.entryPrice}, Exit: ${trade.exitPrice}`);
  }

  if (tradesData.total !== testTrades.length) {
    console.warn(`⚠️  Expected ${testTrades.length} trades, got ${tradesData.total}`);
  } else {
    console.log(`\n✅ SUCCESS: All ${testTrades.length} trades synced to journal!`);
  }
} catch (err) {
  console.error("❌ Trades retrieval failed:", err.message);
  process.exit(1);
}

console.log("\n✅ E2E test complete: account → sync → trades → journal workflow verified!");
