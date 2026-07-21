"use client";

import { CalendarDay } from "@trademind/shared";
import clsx from "clsx";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import {
  Button,
  Card,
  DirectionBadge,
  Select,
  Skeleton,
} from "@/components/ui";
import { fmtDuration, fmtNum, fmtSigned } from "@/lib/api";
import { useAccounts, useCalendar, useTrades } from "@/lib/queries";

// P/L polarity uses the validated diverging pair (blue = profit, red = loss,
// neutral surface at zero) — every cell also carries the number, so color
// never works alone.
const POS = "#00e676"; // Neon green
const NEG = "#991b1b"; // Deep red

function monthStr(d: Date) {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

export default function CalendarPage() {
  const { data: accounts } = useAccounts();
  const [accountId, setAccountId] = useState("");
  const [cursor, setCursor] = useState(() => {
    const now = new Date();
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  });
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const month = monthStr(cursor);
  const { data: days, isLoading } = useCalendar(month, accountId || undefined);
  const activeAccount = accounts?.find((a) => a.id === accountId);
  const currency = activeAccount?.currency ?? "USD";
  const byDate = new Map((days ?? []).map((d) => [d.date, d]));
  const maxAbs = Math.max(1, ...(days ?? []).map((d) => Math.abs(d.pnl)));

  const first = new Date(cursor);
  const startWeekday = (first.getUTCDay() + 6) % 7; // Monday-first grid
  const daysInMonth = new Date(
    Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0),
  ).getUTCDate();

  const cells: (string | null)[] = [
    ...Array<null>(startWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => {
      const d = String(i + 1).padStart(2, "0");
      return `${month}-${d}`;
    }),
  ];

  const monthLabel = first.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
  const totalPnl = (days ?? []).reduce((s, d) => s + d.pnl, 0);
  const winDays = (days ?? []).filter((d) => d.pnl > 0).length;
  const lossDays = (days ?? []).filter((d) => d.pnl < 0).length;

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Trading calendar</h1>
          <p className="mt-0.5 text-sm text-ink-2">
            Daily results (UTC) — click a day to see its trades.
          </p>
        </div>
        <Select
          value={accountId}
          onChange={(e) => setAccountId(e.target.value)}
          aria-label="Account filter"
        >
          <option value="">All accounts</option>
          {accounts?.map((a) => (
            <option key={a.id} value={a.id}>
              {a.label}
            </option>
          ))}
        </Select>
      </div>

      <Card className="p-5">
        <div className="mb-4 flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            aria-label="Previous month"
            onClick={() =>
              setCursor(
                (c) =>
                  new Date(Date.UTC(c.getUTCFullYear(), c.getUTCMonth() - 1, 1)),
              )
            }
          >
            <ChevronLeft className="size-4" aria-hidden />
          </Button>
          <div className="text-center">
            <p className="font-semibold">{monthLabel}</p>
            <p className="mt-0.5 text-sm text-ink-2 tabular-nums">
              {days?.length ? (
                <>
                  <span
                    className={clsx(
                      "font-semibold",
                      totalPnl > 0 && "text-good",
                      totalPnl < 0 && "text-bad",
                    )}
                  >
                    {fmtSigned(totalPnl, currency)}
                  </span>
                  <span className="text-muted">
                    {" "}
                    · {winDays}W / {lossDays}L days
                  </span>
                </>
              ) : (
                <span className="text-muted">no closed trades</span>
              )}
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            aria-label="Next month"
            onClick={() =>
              setCursor(
                (c) =>
                  new Date(Date.UTC(c.getUTCFullYear(), c.getUTCMonth() + 1, 1)),
              )
            }
          >
            <ChevronRight className="size-4" aria-hidden />
          </Button>
        </div>

        {isLoading ? (
          <Skeleton className="h-80" />
        ) : (
          <>
            <div className="grid grid-cols-7 gap-1.5 text-center text-[11px] font-medium tracking-wide text-muted uppercase">
              {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
                <div key={d} className="py-1">
                  {d}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1.5">
              {cells.map((date, i) =>
                date === null ? (
                  <div key={`pad-${i}`} />
                ) : (
                  <DayCell
                    key={date}
                    date={date}
                    day={byDate.get(date)}
                    maxAbs={maxAbs}
                    currency={currency}
                    selected={selectedDay === date}
                    onClick={() =>
                      setSelectedDay(selectedDay === date ? null : date)
                    }
                  />
                ),
              )}
            </div>
          </>
        )}
      </Card>

      {selectedDay && (
        <DayTrades date={selectedDay} accountId={accountId || undefined} />
      )}
    </div>
  );
}

function DayCell({
  date,
  day,
  maxAbs,
  currency,
  selected,
  onClick,
}: {
  date: string;
  day?: CalendarDay;
  maxAbs: number;
  currency: string;
  selected: boolean;
  onClick: () => void;
}) {
  const intensity = day ? 0.16 + 0.6 * (Math.abs(day.pnl) / maxAbs) : 0;
  const pole = day && day.pnl < 0 ? NEG : POS;
  return (
    <button
      onClick={onClick}
      className={clsx(
        "flex min-h-[4.5rem] cursor-pointer flex-col items-start rounded-lg border p-2 text-left transition-all",
        selected
          ? "border-accent shadow-[0_0_0_1px] shadow-accent"
          : "border-white/10 bg-white/[0.02] hover:border-baseline",
      )}
      style={
        day && day.pnl !== 0
          ? {
              backgroundColor: `color-mix(in oklab, ${pole} ${Math.round(intensity * 100)}%, var(--color-surface))`,
            }
          : undefined
      }
      aria-label={`${date}${day ? `: ${day.pnl >= 0 ? "+" : ""}${day.pnl}, ${day.trades} trades` : ""}`}
    >
      <span className="text-xs text-ink-2">{Number(date.slice(8))}</span>
      {day && (
        <>
          <span className="mt-auto text-[10px] font-semibold tabular-nums leading-none">
            {fmtSigned(day.pnl, currency)}
          </span>
          <span className="mt-0.5 text-[9px] leading-none text-ink-2">
            {day.trades} trade{day.trades === 1 ? "" : "s"}
          </span>
        </>
      )}
    </button>
  );
}

function DayTrades({ date, accountId }: { date: string; accountId?: string }) {
  const { data: accounts } = useAccounts();
  const from = `${date}T00:00:00.000Z`;
  const to = `${date}T23:59:59.999Z`;
  const { data, isLoading } = useTrades({
    accountId,
    state: "closed",
    page: 1,
    pageSize: 200,
  });
  const items = (data?.items ?? []).filter(
    (t) => t.closeTime && t.closeTime >= from && t.closeTime <= to,
  );

  const getTradeCurrency = (tradeAccountId: string) => {
    return accounts?.find((a) => a.id === tradeAccountId)?.currency ?? "USD";
  };

  return (
    <Card className="anim-fade-up mt-4 p-0">
      <h2 className="px-5 pt-4 text-sm font-semibold text-ink-2">
        Trades closed on {date}
      </h2>
      {isLoading ? (
        <div className="p-5">
          <Skeleton className="h-16" />
        </div>
      ) : !items.length ? (
        <p className="px-5 py-6 text-sm text-muted">No closed trades this day.</p>
      ) : (
        <table className="mt-2 w-full text-sm tabular-nums">
          <tbody>
            {items.map((t) => (
              <tr
                key={t.id}
                className="border-t border-grid transition-colors hover:bg-surface-2/60"
              >
                <td className="px-5 py-2.5 font-medium">{t.symbol}</td>
                <td className="px-2 py-2.5">
                  <DirectionBadge direction={t.direction} />
                </td>
                <td className="px-2 py-2.5 text-ink-2">{t.volume} lots</td>
                <td className="px-2 py-2.5 text-right text-ink-2">
                  {fmtNum(t.pips, 1)} pips
                </td>
                <td
                  className={clsx(
                    "px-2 py-2.5 text-right font-semibold",
                    t.netProfit > 0 && "text-good",
                    t.netProfit < 0 && "text-bad",
                  )}
                >
                  {fmtSigned(t.netProfit, getTradeCurrency(t.accountId))}
                </td>
                <td className="px-5 py-2.5 text-right text-muted">
                  {fmtDuration(t.durationSec)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Card>
  );
}
