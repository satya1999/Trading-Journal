import { DealPayload } from "@trademind/shared";
import { aggregatePosition, brokerTimeToUtc, pipSize } from "./metrics";

const T0 = 1_750_000_000; // arbitrary broker-time anchor (unix seconds)

function deal(partial: Partial<DealPayload>): DealPayload {
  return {
    ticket: 1,
    positionId: 100,
    orderTicket: 0,
    symbol: "EURUSD",
    type: "buy",
    entry: "in",
    volume: 1,
    price: 1.1,
    sl: 0,
    tp: 0,
    commission: 0,
    swap: 0,
    profit: 0,
    time: T0,
    digits: 5,
    point: 0.00001,
    ...partial,
  };
}

describe("pipSize", () => {
  it("uses 10 points for 5- and 3-digit symbols", () => {
    expect(pipSize(5, 0.00001)).toBeCloseTo(0.0001);
    expect(pipSize(3, 0.001)).toBeCloseTo(0.01);
  });
  it("uses 1 point otherwise (indices, 2-digit metals)", () => {
    expect(pipSize(2, 0.01)).toBeCloseTo(0.01);
    expect(pipSize(1, 0.1)).toBeCloseTo(0.1);
  });
});

describe("brokerTimeToUtc", () => {
  it("subtracts the broker offset", () => {
    const utc = brokerTimeToUtc(T0, 120); // broker is UTC+2
    expect(utc.getTime()).toBe((T0 - 7200) * 1000);
  });
});

describe("aggregatePosition", () => {
  it("builds a closed buy trade from a simple in/out pair", () => {
    const t = aggregatePosition(
      [
        deal({ ticket: 1, entry: "in", price: 1.1, volume: 1, sl: 1.09, tp: 1.12, time: T0 }),
        deal({ ticket: 2, entry: "out", type: "sell", price: 1.11, volume: 1, profit: 1000, commission: -7, swap: -1.5, time: T0 + 3600 }),
      ],
      0,
    )!;
    expect(t.state).toBe("closed");
    expect(t.direction).toBe("buy");
    expect(t.entryPrice).toBeCloseTo(1.1);
    expect(t.exitPrice).toBeCloseTo(1.11);
    expect(t.profit).toBeCloseTo(1000);
    expect(t.netProfit).toBeCloseTo(991.5);
    expect(t.pips).toBeCloseTo(100); // 0.01 / 0.0001
    expect(t.rr).toBeCloseTo(1.0); // 100 pips won vs 100 pips risked
    expect(t.durationSec).toBe(3600);
  });

  it("computes negative pips and rr for a losing sell trade", () => {
    const t = aggregatePosition(
      [
        deal({ ticket: 1, entry: "in", type: "sell", price: 1.2, volume: 0.5, sl: 1.205, time: T0 }),
        deal({ ticket: 2, entry: "out", type: "buy", price: 1.205, volume: 0.5, profit: -250, time: T0 + 60 }),
      ],
      0,
    )!;
    expect(t.direction).toBe("sell");
    expect(t.pips).toBeCloseTo(-50);
    expect(t.rr).toBeCloseTo(-1.0);
  });

  it("VWAPs scale-ins and stays open until fully closed (partial close)", () => {
    const t = aggregatePosition(
      [
        deal({ ticket: 1, entry: "in", price: 1.1, volume: 1, time: T0 }),
        deal({ ticket: 2, entry: "in", price: 1.12, volume: 1, time: T0 + 10 }),
        deal({ ticket: 3, entry: "out", type: "sell", price: 1.13, volume: 1, profit: 200, time: T0 + 20 }),
      ],
      0,
    )!;
    expect(t.state).toBe("open");
    expect(t.volume).toBeCloseTo(2);
    expect(t.entryPrice).toBeCloseTo(1.11);
    expect(t.exitPrice).toBeNull(); // exit only reported once fully closed
    expect(t.pips).toBeNull();
    expect(t.profit).toBeCloseTo(200); // realized part

    const closed = aggregatePosition(
      [
        deal({ ticket: 1, entry: "in", price: 1.1, volume: 1, time: T0 }),
        deal({ ticket: 2, entry: "in", price: 1.12, volume: 1, time: T0 + 10 }),
        deal({ ticket: 3, entry: "out", type: "sell", price: 1.13, volume: 1, profit: 200, time: T0 + 20 }),
        deal({ ticket: 4, entry: "out", type: "sell", price: 1.14, volume: 1, profit: 300, time: T0 + 30 }),
      ],
      0,
    )!;
    expect(closed.state).toBe("closed");
    expect(closed.exitPrice).toBeCloseTo(1.135); // VWAP of the two outs
    expect(closed.profit).toBeCloseTo(500);
  });

  it("is deterministic regardless of deal arrival order (idempotent replays)", () => {
    const deals = [
      deal({ ticket: 1, entry: "in", price: 1.1, volume: 1, time: T0 }),
      deal({ ticket: 2, entry: "out", type: "sell", price: 1.11, volume: 0.5, profit: 50, time: T0 + 10 }),
      deal({ ticket: 3, entry: "out", type: "sell", price: 1.12, volume: 0.5, profit: 100, time: T0 + 20 }),
    ];
    const a = aggregatePosition(deals, 0)!;
    const b = aggregatePosition([deals[2], deals[0], deals[1]], 0)!;
    expect(b).toEqual(a);
    // and replaying the same deals twice through aggregation = same result
    const c = aggregatePosition([...deals], 0)!;
    expect(c).toEqual(a);
  });

  it("returns null when only closing fills are known", () => {
    expect(
      aggregatePosition(
        [deal({ ticket: 9, entry: "out", type: "sell", price: 1.11 })],
        0,
      ),
    ).toBeNull();
  });

  it("caps INOUT reversal volume so the trade reads closed, not over-closed", () => {
    const t = aggregatePosition(
      [
        deal({ ticket: 1, entry: "in", price: 1.1, volume: 1, time: T0 }),
        deal({ ticket: 2, entry: "inout", type: "sell", price: 1.105, volume: 2, profit: 50, time: T0 + 10 }),
      ],
      0,
    )!;
    expect(t.state).toBe("closed");
    expect(t.volume).toBeCloseTo(1);
  });

  it("converts broker time to UTC using the handshake offset", () => {
    const t = aggregatePosition(
      [
        deal({ ticket: 1, entry: "in", time: T0 }),
        deal({ ticket: 2, entry: "out", type: "sell", volume: 1, time: T0 + 100 }),
      ],
      180, // broker UTC+3
    )!;
    expect(t.openTime.getTime()).toBe((T0 - 3 * 3600) * 1000);
  });

  it("uses point (not 10x) for 2-digit symbols like XAUUSD", () => {
    const t = aggregatePosition(
      [
        deal({ ticket: 1, entry: "in", symbol: "XAUUSD", price: 2400.0, digits: 2, point: 0.01, volume: 0.1, time: T0 }),
        deal({ ticket: 2, entry: "out", symbol: "XAUUSD", type: "sell", price: 2405.0, digits: 2, point: 0.01, volume: 0.1, profit: 50, time: T0 + 100 }),
      ],
      0,
    )!;
    expect(t.pips).toBeCloseTo(500); // 5.00 move / 0.01 point
  });
});
