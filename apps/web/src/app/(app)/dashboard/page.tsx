"use client";

import clsx from "clsx";
import { ArrowDownRight, ArrowUpRight, Cable } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { EquityChart } from "@/components/equity-chart";
import { Card, DirectionBadge, Select, Skeleton } from "@/components/ui";
import { fmtDuration, fmtMoney, fmtNum, fmtSigned } from "@/lib/api";
import {
  useAccounts,
  useEquityCurve,
  useSummary,
  useTrades,
} from "@/lib/queries";

export default function DashboardPage() {
  const { data: accounts, isLoading: accountsLoading } = useAccounts();
  const [accountId, setAccountId] = useState("");
  const { data: s, isLoading } = useSummary(accountId || undefined);
  const { data: curve } = useEquityCurve(accountId || undefined);
  const { data: recent } = useTrades({
    accountId,
    state: "closed",
    page: 1,
    pageSize: 8,
  });

  const activeAccount = accounts?.find((a) => a.id === accountId);
  const currency = activeAccount?.currency ?? "USD";
  const noAccounts = !accountsLoading && !accounts?.length;

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Dashboard</h1>
          <p className="mt-0.5 text-sm text-ink-2">
            Your trading performance at a glance.
          </p>
        </div>
        {!!accounts?.length && (
          <Select
            value={accountId}
            onChange={(e) => setAccountId(e.target.value)}
            aria-label="Account filter"
          >
            <option value="">All accounts</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.label}
              </option>
            ))}
          </Select>
        )}
      </div>

      {noAccounts && (
        <Card className="anim-fade-up mb-4 flex items-center gap-4 border-accent/30 bg-accent/5 px-5">
          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-accent/15">
            <Cable className="size-5 text-accent" aria-hidden />
          </span>
          <div className="flex-1">
            <p className="font-medium">Connect your MT5 account</p>
            <p className="text-sm text-ink-2">
              Two minutes of setup, then this dashboard fills itself.
            </p>
          </div>
          <Link
            href="/accounts"
            className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-deep"
          >
            Set up now
          </Link>
        </Card>
      )}

      {isLoading || !s ? (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <StatTile
              label="Today's P/L"
              value={fmtSigned(s.todayPnl, currency)}
              delta={s.todayPnl}
            />
            <StatTile
              label="Win rate"
              value={s.winRate == null ? "—" : `${s.winRate}%`}
              hint={`${s.closedTrades} closed trades`}
            />
            <StatTile
              label="Profit factor"
              value={fmtNum(s.profitFactor)}
              hint="gross win ÷ gross loss"
            />
            <StatTile
              label="Avg R multiple"
              value={fmtNum(s.avgRR)}
              hint="risk-adjusted result"
            />
            <StatTile label="Balance" value={fmtMoney(s.balance, currency)} />
            <StatTile
              label="Equity"
              value={fmtMoney(s.equity, currency)}
              hint={`${s.openTrades} open trade${s.openTrades === 1 ? "" : "s"}`}
            />
            <StatTile
              label="Net P/L"
              value={fmtSigned(s.netProfit, currency)}
              delta={s.netProfit}
            />
            <StatTile
              label="Max drawdown"
              value={s.maxDrawdown == null ? "—" : fmtMoney(-s.maxDrawdown, currency)}
              hint="peak to trough"
            />
          </div>

          <Card className="mt-4">
            <h2 className="mb-2 text-sm font-semibold text-ink-2">
              Equity curve
            </h2>
            {curve && curve.trades.length > 0 ? (
              <EquityChart trades={curve.trades} snapshots={curve.snapshots} currency={currency} />
            ) : (
              <p className="py-16 text-center text-sm text-muted">
                The curve appears after your first closed trades sync.
              </p>
            )}
          </Card>

          <Card className="mt-4 p-0">
            <div className="flex items-center justify-between px-5 pt-4">
              <h2 className="text-sm font-semibold text-ink-2">
                Recent closed trades
              </h2>
              <Link
                href="/trades"
                className="text-xs font-medium text-accent hover:underline"
              >
                View all →
              </Link>
            </div>
            {!recent?.items.length ? (
              <p className="px-5 py-8 text-sm text-muted">
                Nothing closed yet.
              </p>
            ) : (
              <table className="mt-2 w-full text-sm tabular-nums">
                <tbody>
                  {(() => {
                    const getTradeCurrency = (tradeAccountId: string) => {
                      return accounts?.find((a) => a.id === tradeAccountId)?.currency ?? "USD";
                    };
                    return recent.items.map((t) => (
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
                        <td className="px-2 py-2.5 text-ink-2">
                          {fmtDuration(t.durationSec)}
                        </td>
                        <td className="px-5 py-2.5 text-right text-muted">
                          {t.closeTime
                            ? new Date(t.closeTime).toLocaleDateString()
                            : "—"}
                        </td>
                      </tr>
                    ));
                  })()}
                </tbody>
              </table>
            )}
          </Card>
        </>
      )}
    </div>
  );
}

function StatTile({
  label,
  value,
  delta,
  hint,
}: {
  label: string;
  value: string;
  delta?: number;
  hint?: string;
}) {
  return (
    <Card interactive className="anim-fade-up">
      <p className="text-[11px] font-medium tracking-wide text-muted uppercase">
        {label}
      </p>
      <p
        className={clsx(
          "mt-1.5 flex items-center gap-1 text-xl font-semibold",
          delta != null && delta > 0 && "text-good",
          delta != null && delta < 0 && "text-bad",
        )}
      >
        {delta != null && delta > 0 && (
          <ArrowUpRight className="size-4" aria-hidden />
        )}
        {delta != null && delta < 0 && (
          <ArrowDownRight className="size-4" aria-hidden />
        )}
        {value}
      </p>
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </Card>
  );
}
