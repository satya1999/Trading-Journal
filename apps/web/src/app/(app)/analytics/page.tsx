"use client";

import { AnalyticsBreakdown, Insight } from "@trademind/shared";
import clsx from "clsx";
import type { EChartsOption } from "echarts";
import {
  AlertOctagon,
  AlertTriangle,
  CheckCircle2,
  Lightbulb,
} from "lucide-react";
import { useMemo, useState } from "react";
import { CH, EChart, moneyFmt } from "@/components/echart";
import { Card, Select, Skeleton } from "@/components/ui";
import { fmtMoney, fmtNum, fmtSigned } from "@/lib/api";
import { useAccounts, useBreakdown } from "@/lib/queries";

export default function AnalyticsPage() {
  const { data: accounts } = useAccounts();
  const [accountId, setAccountId] = useState("");
  const { data, isLoading } = useBreakdown(accountId || undefined);

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Analytics</h1>
          <p className="mt-0.5 text-sm text-ink-2">
            Where your money is actually made and lost — computed from every
            closed trade.
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

      {isLoading || !data ? (
        <div className="flex flex-col gap-4">
          <Skeleton className="h-28" />
          <div className="grid gap-4 md:grid-cols-2">
            <Skeleton className="h-72" />
            <Skeleton className="h-72" />
          </div>
        </div>
      ) : data.closedTrades === 0 ? (
        <Card className="py-14 text-center text-ink-2">
          Analytics unlock after your first closed trades sync.
        </Card>
      ) : (
        <BreakdownView data={data} />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */

const TONE: Record<
  Insight["tone"],
  { icon: typeof Lightbulb; color: string; label: string }
> = {
  critical: { icon: AlertOctagon, color: "#d03b3b", label: "Critical" },
  warning: { icon: AlertTriangle, color: "#fab219", label: "Warning" },
  info: { icon: Lightbulb, color: "#3987e5", label: "Insight" },
  good: { icon: CheckCircle2, color: "#0ca30c", label: "Working" },
};

function BreakdownView({ data }: { data: AnalyticsBreakdown }) {
  return (
    <>
      <section aria-label="How to improve">
        <h2 className="mb-2 text-sm font-semibold text-ink-2">
          How to improve — from your last {data.closedTrades} closed trades
        </h2>
        <div className="grid gap-3 md:grid-cols-2">
          {data.insights.map((ins) => {
            const tone = TONE[ins.tone];
            return (
              <Card
                key={ins.title}
                className="anim-fade-up border-l-2 pl-4"
                interactive
              >
                <div
                  className="flex items-center gap-2 text-xs font-semibold tracking-wide uppercase"
                  style={{ color: tone.color }}
                >
                  <tone.icon className="size-3.5" aria-hidden />
                  {tone.label}
                </div>
                <p className="mt-1.5 font-semibold">{ins.title}</p>
                <p className="mt-1 text-sm leading-relaxed text-ink-2">
                  {ins.body}
                </p>
              </Card>
            );
          })}
        </div>
      </section>

      <section
        aria-label="Key numbers"
        className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4"
      >
        <MiniStat
          label="Expectancy / trade"
          value={data.expectancy == null ? "—" : fmtSigned(data.expectancy)}
          signed={data.expectancy}
        />
        <MiniStat
          label="Average win"
          value={data.avgWin == null ? "—" : fmtMoney(data.avgWin)}
        />
        <MiniStat
          label="Average loss"
          value={data.avgLoss == null ? "—" : fmtMoney(-data.avgLoss)}
        />
        <MiniStat
          label="Trades without SL"
          value={data.noSlPct == null ? "—" : `${fmtNum(data.noSlPct, 0)}%`}
        />
      </section>

      <section className="mt-4 grid gap-4 lg:grid-cols-2">
        <ChartCard
          title="P/L by hour of day"
          subtitle="When you open trades (UTC) — blue profits, red losses"
        >
          <HourChart data={data} />
        </ChartCard>
        <ChartCard
          title="P/L by weekday"
          subtitle="Net result of trades opened on each day"
        >
          <WeekdayChart data={data} />
        </ChartCard>
        <ChartCard
          title="Symbol performance"
          subtitle="Net P/L per market — where your edge actually is"
        >
          <SymbolChart data={data} />
        </ChartCard>
        <ChartCard
          title="R-multiple distribution"
          subtitle="How your results spread against risk (needs a stop loss)"
        >
          <RRChart data={data} />
        </ChartCard>
      </section>
    </>
  );
}

function MiniStat({
  label,
  value,
  signed,
}: {
  label: string;
  value: string;
  signed?: number | null;
}) {
  return (
    <Card>
      <p className="text-[11px] font-medium tracking-wide text-muted uppercase">
        {label}
      </p>
      <p
        className={clsx(
          "mt-1 text-lg font-semibold tabular-nums",
          signed != null && signed > 0 && "text-good",
          signed != null && signed < 0 && "text-bad",
        )}
      >
        {value}
      </p>
    </Card>
  );
}

function ChartCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="anim-fade-up">
      <h3 className="text-sm font-semibold">{title}</h3>
      <p className="mb-2 text-xs text-muted">{subtitle}</p>
      {children}
    </Card>
  );
}

/* ---- charts ------------------------------------------------------- */

const axis = {
  category: (data: string[]) => ({
    type: "category" as const,
    data,
    axisLine: { lineStyle: { color: CH.baseline } },
    axisTick: { show: false },
    axisLabel: { color: CH.muted, fontSize: 11 },
  }),
  value: () => ({
    type: "value" as const,
    axisLabel: {
      color: CH.muted,
      fontSize: 11,
      formatter: (v: number) =>
        new Intl.NumberFormat("en-US", { notation: "compact" }).format(v),
    },
    splitLine: { lineStyle: { color: CH.grid } },
  }),
};

const polarityBar = (values: number[], name: string) => ({
  name,
  type: "bar" as const,
  barMaxWidth: 18,
  data: values.map((v) => ({
    value: v,
    itemStyle: {
      color: v >= 0 ? CH.pos : CH.neg,
      borderRadius: v >= 0 ? [4, 4, 0, 0] : [0, 0, 4, 4],
    },
  })),
});

const baseTooltip = {
  trigger: "axis" as const,
  axisPointer: { type: "shadow" as const },
  ...CH.tooltip,
  valueFormatter: moneyFmt,
};

function HourChart({ data }: { data: AnalyticsBreakdown }) {
  const option = useMemo<EChartsOption>(
    () => ({
      tooltip: baseTooltip,
      grid: { left: 8, right: 8, top: 14, bottom: 8, containLabel: true },
      xAxis: axis.category(data.byHour.map((h) => h.key)),
      yAxis: axis.value(),
      series: [polarityBar(data.byHour.map((h) => h.pnl), "Net P/L")],
    }),
    [data],
  );
  return <EChart option={option} ariaLabel="Net profit and loss by hour of day" />;
}

function WeekdayChart({ data }: { data: AnalyticsBreakdown }) {
  const option = useMemo<EChartsOption>(
    () => ({
      tooltip: baseTooltip,
      grid: { left: 8, right: 8, top: 14, bottom: 8, containLabel: true },
      xAxis: axis.category(data.byWeekday.map((d) => d.key)),
      yAxis: axis.value(),
      series: [polarityBar(data.byWeekday.map((d) => d.pnl), "Net P/L")],
    }),
    [data],
  );
  return <EChart option={option} ariaLabel="Net profit and loss by weekday" />;
}

function SymbolChart({ data }: { data: AnalyticsBreakdown }) {
  const option = useMemo<EChartsOption>(() => {
    const top = data.bySymbol.slice(0, 8);
    const rest = data.bySymbol.slice(8);
    const rows = [...top];
    if (rest.length) {
      rows.push({
        symbol: `Other (${rest.length})`,
        pnl: Math.round(rest.reduce((s, r) => s + r.pnl, 0) * 100) / 100,
        trades: rest.reduce((s, r) => s + r.trades, 0),
        wins: rest.reduce((s, r) => s + r.wins, 0),
        avgRR: null,
      });
    }
    const ordered = [...rows].reverse(); // largest at the top
    return {
      tooltip: {
        ...baseTooltip,
        formatter: (params: unknown) => {
          const p = (params as { dataIndex: number }[])[0];
          const r = ordered[p.dataIndex];
          return `<b>${r.symbol}</b><br/>${moneyFmt(r.pnl)} · ${r.trades} trades · ${((r.wins / Math.max(1, r.trades)) * 100).toFixed(0)}% wins`;
        },
      },
      grid: { left: 8, right: 48, top: 8, bottom: 8, containLabel: true },
      xAxis: axis.value(),
      yAxis: {
        ...axis.category(ordered.map((r) => r.symbol)),
        axisLabel: { color: CH.ink2, fontSize: 11 },
      },
      series: [
        {
          name: "Net P/L",
          type: "bar" as const,
          barMaxWidth: 16,
          label: {
            show: true,
            position: "right" as const,
            color: CH.ink2,
            fontSize: 11,
            formatter: (p: { value: unknown }) => moneyFmt(p.value),
          },
          data: ordered.map((r) => ({
            value: r.pnl,
            itemStyle: {
              color: r.pnl >= 0 ? CH.pos : CH.neg,
              borderRadius: r.pnl >= 0 ? [0, 4, 4, 0] : [4, 0, 0, 4],
            },
          })),
        },
      ],
    };
  }, [data]);
  const height = Math.max(220, Math.min(9, data.bySymbol.length + 1) * 34);
  return (
    <EChart
      option={option}
      height={height}
      ariaLabel="Net profit and loss by symbol"
    />
  );
}

function RRChart({ data }: { data: AnalyticsBreakdown }) {
  const option = useMemo<EChartsOption>(
    () => ({
      tooltip: {
        ...baseTooltip,
        valueFormatter: (v: unknown) => `${v} trades`,
      },
      grid: { left: 8, right: 8, top: 14, bottom: 8, containLabel: true },
      xAxis: {
        ...axis.category(data.rrHistogram.map((b) => b.bucket)),
        name: "R",
        nameTextStyle: { color: CH.muted },
      },
      yAxis: axis.value(),
      series: [
        {
          name: "Trades",
          type: "bar" as const,
          barMaxWidth: 26,
          itemStyle: { color: CH.blue, borderRadius: [4, 4, 0, 0] },
          data: data.rrHistogram.map((b) => b.count),
        },
      ],
    }),
    [data],
  );
  return (
    <EChart option={option} ariaLabel="Distribution of R multiples across closed trades" />
  );
}
