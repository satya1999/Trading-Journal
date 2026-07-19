"use client";

import { EquityPoint } from "@trademind/shared";
import * as echarts from "echarts";
import { useEffect, useRef } from "react";

// Two series max (Balance = realized, Equity = heartbeat snapshots) —
// categorical slots 1 (blue) and 2 (green), legend + crosshair tooltip.
const INK_2 = "#c3c2b7";
const MUTED = "#898781";
const GRID = "#2c2c2a";
const BASELINE = "#383835";
const SERIES_1 = "#3987e5";
const SERIES_2 = "#008300";

export function EquityChart({
  trades,
  snapshots,
}: {
  trades: EquityPoint[];
  snapshots: EquityPoint[];
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    const chart = echarts.init(ref.current);

    chart.setOption({
      backgroundColor: "transparent",
      textStyle: { fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif" },
      legend: {
        top: 0,
        right: 0,
        textStyle: { color: INK_2, fontSize: 12 },
        itemWidth: 14,
        itemHeight: 2,
        icon: "rect",
      },
      grid: { left: 8, right: 8, top: 28, bottom: 8, containLabel: true },
      tooltip: {
        trigger: "axis",
        axisPointer: { type: "cross", label: { backgroundColor: BASELINE } },
        backgroundColor: "#1a1a19",
        borderColor: "rgba(255,255,255,0.1)",
        textStyle: { color: "#ffffff", fontSize: 12 },
        valueFormatter: (v: number) =>
          v == null
            ? "—"
            : new Intl.NumberFormat("en-US", {
                style: "currency",
                currency: "USD",
              }).format(v),
      },
      xAxis: {
        type: "time",
        axisLine: { lineStyle: { color: BASELINE } },
        axisLabel: { color: MUTED, fontSize: 11 },
        splitLine: { show: false },
      },
      yAxis: {
        type: "value",
        scale: true,
        axisLabel: {
          color: MUTED,
          fontSize: 11,
          formatter: (v: number) =>
            new Intl.NumberFormat("en-US", { notation: "compact" }).format(v),
        },
        splitLine: { lineStyle: { color: GRID } },
      },
      series: [
        {
          name: "Balance",
          type: "line",
          step: "end",
          showSymbol: false,
          symbolSize: 8,
          lineStyle: { width: 2, color: SERIES_1 },
          itemStyle: { color: SERIES_1 },
          emphasis: { focus: "series" },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: "rgba(57,135,229,0.22)" },
              { offset: 1, color: "rgba(57,135,229,0)" },
            ]),
          },
          data: trades.map((p) => [p.time, p.balance]),
        },
        ...(snapshots.length > 1
          ? [
              {
                name: "Equity",
                type: "line" as const,
                showSymbol: false,
                symbolSize: 8,
                lineStyle: { width: 2, color: SERIES_2 },
                itemStyle: { color: SERIES_2 },
                emphasis: { focus: "series" },
                data: snapshots.map((p) => [p.time, p.equity]),
              },
            ]
          : []),
      ],
    });

    const observer = new ResizeObserver(() => chart.resize());
    observer.observe(ref.current);
    return () => {
      observer.disconnect();
      chart.dispose();
    };
  }, [trades, snapshots]);

  return (
    <div
      ref={ref}
      className="h-72 w-full"
      role="img"
      aria-label="Balance and equity over time"
    />
  );
}
