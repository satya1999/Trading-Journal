"use client";

import { AnalyticsBreakdown, Insight } from "@trademind/shared";
import clsx from "clsx";
import type { EChartsOption } from "echarts";
import {
  AlertOctagon,
  AlertTriangle,
  CheckCircle2,
  Lightbulb,
  MessageCircleQuestion,
} from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { CoachChat } from "@/components/coach-chat";
import { CH, EChart, moneyFmt } from "@/components/echart";
import { Card, Select, Skeleton } from "@/components/ui";
import { fmtMoney, fmtNum, fmtSigned } from "@/lib/api";
import { useAccounts, useBreakdown } from "@/lib/queries";

export default function AnalyticsPage() {
  const { data: accounts } = useAccounts();
  const [accountId, setAccountId] = useState("");
  const { data, isLoading } = useBreakdown(accountId || undefined);
  const [draft, setDraft] = useState("");
  const chatRef = useRef<HTMLDivElement>(null);

  const activeAccount = accounts?.find((a) => a.id === accountId);
  const currency = activeAccount?.currency ?? "USD";

  function askCoach(question: string) {
    setDraft(question);
    chatRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

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
        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="py-14 text-center text-ink-2 lg:col-span-2">
            Charts and suggestions unlock after your first closed trades sync.
          </Card>
          <CoachChat
            accountId={accountId || undefined}
            draft={draft}
            onDraftChange={setDraft}
          />
        </div>
      ) : (
        <div className="grid items-start gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <BreakdownView data={data} currency={currency} onAskCoach={askCoach} />
          </div>
          <div className="lg:sticky lg:top-4">
            <CoachChat
              accountId={accountId || undefined}
              draft={draft}
              onDraftChange={setDraft}
              panelRef={chatRef}
            />
          </div>
        </div>
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

function BreakdownView({
  data,
  currency,
  onAskCoach,
}: {
  data: AnalyticsBreakdown;
  currency: string;
  onAskCoach: (question: string) => void;
}) {
  return (
    <>
      <section aria-label="How to improve">
        <h2 className="mb-2 text-sm font-semibold text-ink-2">
          Suggestions — from your last {data.closedTrades} closed trades
        </h2>
        <div className="grid gap-3 md:grid-cols-2">
          {data.insights.map((ins) => {
            const tone = TONE[ins.tone];
            return (
              <Card
                key={ins.title}
                className="anim-fade-up flex flex-col border-l-2 pl-4"
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
                <button
                  type="button"
                  onClick={() =>
                    onAskCoach(`Tell me more about this: "${ins.title}" — ${ins.body}`)
                  }
                  className="mt-2.5 flex items-center gap-1.5 self-start text-xs font-medium text-accent transition-colors hover:text-accent-deep"
                >
                  <MessageCircleQuestion className="size-3.5" aria-hidden />
                  Ask the coach about this
                </button>
              </Card>
            );
          })}
        </div>
      </section>

      <section
        aria-label="Key numbers"
        className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6"
      >
        <MiniStat
          label="Expectancy / trade"
          value={data.expectancy == null ? "—" : fmtSigned(data.expectancy, currency)}
          signed={data.expectancy}
        />
        <MiniStat
          label="Average win"
          value={data.avgWin == null ? "—" : fmtMoney(data.avgWin, currency)}
        />
        <MiniStat
          label="Average loss"
          value={data.avgLoss == null ? "—" : fmtMoney(-data.avgLoss, currency)}
        />
        <MiniStat
          label="Trades without SL"
          value={data.noSlPct == null ? "—" : `${fmtNum(data.noSlPct, 0)}%`}
        />
        <MiniStat
          label="Best win streak"
          value={data.streaks ? `${data.streaks.maxWinStreak} wins` : "—"}
        />
        <MiniStat
          label="Worst loss streak"
          value={data.streaks ? `${data.streaks.maxLossStreak} losses` : "—"}
        />
      </section>

      <section className="mt-4 grid gap-4 lg:grid-cols-2">
        <ChartCard
          title="P/L by hour of day"
          subtitle="When you open trades (UTC) — green profits, red losses"
        >
          <HourChart data={data} currency={currency} />
        </ChartCard>
        <ChartCard
          title="P/L by weekday"
          subtitle="Net result of trades opened on each day"
        >
          <WeekdayChart data={data} currency={currency} />
        </ChartCard>
        <div className="lg:col-span-2">
          <ChartCard
            title="Profit heatmap"
            subtitle="Weekday × hour (UTC) — where in the week your money moves; empty cells = no trades"
          >
            <HeatmapChart data={data} currency={currency} />
          </ChartCard>
        </div>
        <ChartCard
          title="Symbol performance"
          subtitle="Net P/L per market — where your edge actually is"
        >
          <SymbolChart data={data} currency={currency} />
        </ChartCard>
        <ChartCard
          title="Session performance"
          subtitle="Net P/L by market session (UTC)"
        >
          <SessionChart data={data} currency={currency} />
        </ChartCard>
        <ChartCard
          title="Holding time analysis"
          subtitle="Win rate & P/L relative to trade duration"
        >
          <DurationChart data={data} currency={currency} />
        </ChartCard>
        <ChartCard
          title="R-multiple distribution"
          subtitle="How your results spread against risk (needs a stop loss)"
        >
          <RRChart data={data} />
        </ChartCard>
      </section>

      <section className="mt-4">
        <Card className="anim-fade-up">
          <h3 className="text-sm font-semibold">Strategy & Setup Performance</h3>
          <p className="mb-3 text-xs text-muted">Win rate and risk ratios per tagged playbook</p>
          <StrategyTable data={data} currency={currency} />
        </Card>
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
  valueFormatter: (v: any) => moneyFmt(v),
};

function HourChart({ data, currency }: { data: AnalyticsBreakdown; currency: string }) {
  const option = useMemo<EChartsOption>(
    () => ({
      tooltip: {
        ...baseTooltip,
        valueFormatter: (v: unknown) => moneyFmt(v, currency),
      },
      grid: { left: 8, right: 8, top: 14, bottom: 8, containLabel: true },
      xAxis: axis.category(data.byHour.map((h) => h.key)),
      yAxis: axis.value(),
      series: [polarityBar(data.byHour.map((h) => h.pnl), "Net P/L")],
    }),
    [data, currency],
  );
  return <EChart option={option} ariaLabel="Net profit and loss by hour of day" />;
}

function WeekdayChart({ data, currency }: { data: AnalyticsBreakdown; currency: string }) {
  const option = useMemo<EChartsOption>(
    () => ({
      tooltip: {
        ...baseTooltip,
        valueFormatter: (v: unknown) => moneyFmt(v, currency),
      },
      grid: { left: 8, right: 8, top: 14, bottom: 8, containLabel: true },
      xAxis: axis.category(data.byWeekday.map((d) => d.key)),
      yAxis: axis.value(),
      series: [polarityBar(data.byWeekday.map((d) => d.pnl), "Net P/L")],
    }),
    [data, currency],
  );
  return <EChart option={option} ariaLabel="Net profit and loss by weekday" />;
}

function SymbolChart({ data, currency }: { data: AnalyticsBreakdown; currency: string }) {
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
          return `<b>${r.symbol}</b><br/>${moneyFmt(r.pnl, currency)} · ${r.trades} trades · ${((r.wins / Math.max(1, r.trades)) * 100).toFixed(0)}% wins`;
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
            formatter: (p: { value: unknown }) => moneyFmt(p.value, currency),
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
  }, [data, currency]);
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

const WEEK = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function HeatmapChart({ data, currency }: { data: AnalyticsBreakdown; currency: string }) {
  const option = useMemo<EChartsOption>(() => {
    const cells = (data.heatmap ?? []).filter((c) => c.trades > 0);
    const maxAbs = Math.max(1, ...cells.map((c) => Math.abs(c.pnl)));
    const tradeCount = new Map(
      cells.map((c) => [`${c.weekday}-${c.hour}`, c.trades]),
    );
    return {
      tooltip: {
        ...CH.tooltip,
        formatter: (params: unknown) => {
          const p = params as { value: [number, number, number] };
          const [h, d, pnl] = p.value;
          const hour = String(h).padStart(2, "0");
          const n = tradeCount.get(`${WEEK[d]}-${hour}`) ?? 0;
          return `<b>${WEEK[d]} ${hour}:00 UTC</b><br/>${moneyFmt(pnl, currency)} · ${n} trade${n === 1 ? "" : "s"}`;
        },
      },
      grid: { left: 8, right: 8, top: 8, bottom: 8, containLabel: true },
      xAxis: {
        type: "category" as const,
        data: Array.from({ length: 24 }, (_, h) => String(h).padStart(2, "0")),
        axisLine: { lineStyle: { color: CH.baseline } },
        axisTick: { show: false },
        axisLabel: { color: CH.muted, fontSize: 10, interval: 2 },
        splitArea: { show: false },
      },
      yAxis: {
        type: "category" as const,
        data: WEEK,
        inverse: true,
        axisLine: { lineStyle: { color: CH.baseline } },
        axisTick: { show: false },
        axisLabel: { color: CH.ink2, fontSize: 11 },
      },
      // diverging blue↔red around a neutral dark midpoint; hidden legend —
      // the tooltip carries exact values
      visualMap: {
        show: false,
        min: -maxAbs,
        max: maxAbs,
        inRange: { color: [CH.neg, "#262624", CH.pos] },
      },
      series: [
        {
          type: "heatmap" as const,
          data: cells.map((c) => [
            Number(c.hour),
            WEEK.indexOf(c.weekday),
            c.pnl,
          ]),
          itemStyle: { borderColor: "#0d0d0d", borderWidth: 2, borderRadius: 3 },
          emphasis: {
            itemStyle: { borderColor: "rgba(255,255,255,0.5)", borderWidth: 1 },
          },
        },
      ],
    };
  }, [data, currency]);
  return (
    <EChart
      option={option}
      height={240}
      ariaLabel="Profit heatmap by weekday and hour"
    />
  );
}

function SessionChart({ data, currency }: { data: AnalyticsBreakdown; currency: string }) {
  const option = useMemo<EChartsOption>(() => {
    const ordered = [...data.bySession].reverse();
    return {
      tooltip: {
        ...baseTooltip,
        valueFormatter: (v: unknown) => moneyFmt(v, currency),
      },
      grid: { left: 8, right: 48, top: 8, bottom: 8, containLabel: true },
      xAxis: axis.value(),
      yAxis: {
        ...axis.category(ordered.map((r) => r.session)),
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
            formatter: (p: { value: unknown }) => moneyFmt(p.value, currency),
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
  }, [data, currency]);
  return <EChart option={option} height={200} ariaLabel="Net profit and loss by market session" />;
}

function DurationChart({ data, currency }: { data: AnalyticsBreakdown; currency: string }) {
  const option = useMemo<EChartsOption>(
    () => ({
      tooltip: {
        ...baseTooltip,
        valueFormatter: (v: unknown) => moneyFmt(v, currency),
      },
      grid: { left: 8, right: 8, top: 14, bottom: 8, containLabel: true },
      xAxis: axis.category(data.byDuration.map((d) => d.bucket)),
      yAxis: axis.value(),
      series: [
        {
          name: "Net P/L",
          type: "bar" as const,
          barMaxWidth: 26,
          data: data.byDuration.map((d) => ({
            value: d.pnl,
            itemStyle: {
              color: d.pnl >= 0 ? CH.pos : CH.neg,
              borderRadius: d.pnl >= 0 ? [4, 4, 0, 0] : [0, 0, 4, 4],
            },
          })),
        },
      ],
    }),
    [data, currency],
  );
  return <EChart option={option} height={220} ariaLabel="Net profit and loss by holding duration" />;
}

function StrategyTable({ data, currency }: { data: AnalyticsBreakdown; currency: string }) {
  const all = useMemo(() => {
    const list: { name: string; type: "Strategy" | "Setup"; pnl: number; trades: number; wins: number; avgRR: number | null }[] = [];
    data.byStrategy.forEach((s) => list.push({ name: s.name, type: "Strategy", pnl: s.pnl, trades: s.trades, wins: s.wins, avgRR: s.avgRR }));
    data.bySetup.forEach((s) => list.push({ name: s.name, type: "Setup", pnl: s.pnl, trades: s.trades, wins: s.wins, avgRR: s.avgRR }));
    return list.sort((a, b) => b.pnl - a.pnl);
  }, [data]);

  if (all.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted">
        No tagged strategies or setups yet. Add tags in your Trade Journal notes!
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm tabular-nums">
        <thead>
          <tr className="border-b bg-white/[0.03] text-left text-[10px] tracking-wide text-muted uppercase">
            <th className="px-4 py-2 font-medium">Name</th>
            <th className="px-2 py-2 font-medium">Type</th>
            <th className="px-2 py-2 text-right font-medium">Win Rate</th>
            <th className="px-2 py-2 text-right font-medium">Avg R</th>
            <th className="px-2 py-2 text-right font-medium">Trades</th>
            <th className="px-4 py-2 text-right font-medium">Net P/L</th>
          </tr>
        </thead>
        <tbody>
          {all.map((item) => (
            <tr key={`${item.type}-${item.name}`} className="border-b border-grid last:border-0 hover:bg-surface-2/40">
              <td className="px-4 py-2 font-medium">{item.name}</td>
              <td className="px-2 py-2">
                <span className={clsx("rounded-md px-1.5 py-0.5 text-[10px] font-semibold", item.type === "Strategy" ? "bg-accent/10 text-accent" : "bg-series-2/10 text-good")}>
                  {item.type}
                </span>
              </td>
              <td className="px-2 py-2 text-right">
                {item.trades ? `${((item.wins / item.trades) * 100).toFixed(0)}%` : "—"}
              </td>
              <td className="px-2 py-2 text-right">{fmtNum(item.avgRR)}</td>
              <td className="px-2 py-2 text-right text-ink-2">{item.trades}</td>
              <td className={clsx("px-4 py-2 text-right font-semibold", item.pnl > 0 && "text-good", item.pnl < 0 && "text-bad")}>
                {fmtSigned(item.pnl, currency)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
