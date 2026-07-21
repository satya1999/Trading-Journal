"use client";

import * as echarts from "echarts";
import { useEffect, useRef } from "react";

// Shared chart chrome (validated dark palette). Data colors are passed per
// chart: blue/red diverging for P/L polarity, single blue for frequency.
export const CH = {
  pos: "#00e676", // Neon green
  neg: "#991b1b", // Deep red
  blue: "#3987e5",
  ink: "#ffffff",
  ink2: "#c3c2b7",
  muted: "#898781",
  grid: "#2c2c2a",
  baseline: "#383835",
  tooltip: {
    backgroundColor: "#1a1a19",
    borderColor: "rgba(255,255,255,0.1)",
    textStyle: { color: "#ffffff", fontSize: 12 },
  },
} as const;

export const moneyFmt = (v: unknown, currency = "USD") => {
  if (typeof v !== "number") return "—";
  try {
    const isIso = /^[A-Z]{3}$/i.test(currency);
    if (isIso) {
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: currency.toUpperCase(),
        maximumFractionDigits: 0,
      }).format(v);
    }
  } catch (e) {}
  return `${v.toFixed(0)} ${currency}`;
};

export function EChart({
  option,
  height = 260,
  ariaLabel,
}: {
  option: echarts.EChartsOption;
  height?: number;
  ariaLabel: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    const chart = echarts.init(ref.current);
    chart.setOption({
      backgroundColor: "transparent",
      textStyle: {
        fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif",
      },
      ...option,
    });
    const observer = new ResizeObserver(() => chart.resize());
    observer.observe(ref.current);
    return () => {
      observer.disconnect();
      chart.dispose();
    };
  }, [option]);

  return (
    <div
      ref={ref}
      style={{ height }}
      className="w-full"
      role="img"
      aria-label={ariaLabel}
    />
  );
}
