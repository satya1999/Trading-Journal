"use client";

import { useQuery } from "@tanstack/react-query";
import {
  AnalyticsBreakdown,
  AnalyticsSummary,
  CalendarDay,
  EquityPoint,
  TradeDto,
  TradingAccountDto,
} from "@trademind/shared";
import { api } from "./api";

export type AccountWithLabel = TradingAccountDto & { label: string };

export function useAccounts(options?: { refetchInterval?: number }) {
  return useQuery({
    queryKey: ["accounts"],
    queryFn: () => api<AccountWithLabel[]>("/accounts"),
    refetchInterval: options?.refetchInterval,
  });
}

export interface TradesPage {
  total: number;
  page: number;
  pageSize: number;
  items: TradeDto[];
}

export function useTrades(filters: Record<string, string | number | undefined>) {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(filters)) {
    if (v !== undefined && v !== "") params.set(k, String(v));
  }
  const qs = params.toString();
  return useQuery({
    queryKey: ["trades", qs],
    queryFn: () => api<TradesPage>(`/trades${qs ? `?${qs}` : ""}`),
  });
}

export function useSummary(accountId?: string) {
  return useQuery({
    queryKey: ["summary", accountId ?? "all"],
    queryFn: () =>
      api<AnalyticsSummary>(
        `/analytics/summary${accountId ? `?accountId=${accountId}` : ""}`,
      ),
    refetchInterval: 30_000,
  });
}

export function useEquityCurve(accountId?: string) {
  return useQuery({
    queryKey: ["equity-curve", accountId ?? "all"],
    queryFn: () =>
      api<{ trades: EquityPoint[]; snapshots: EquityPoint[] }>(
        `/analytics/equity-curve${accountId ? `?accountId=${accountId}` : ""}`,
      ),
    refetchInterval: 60_000,
  });
}

export function useBreakdown(accountId?: string) {
  return useQuery({
    queryKey: ["breakdown", accountId ?? "all"],
    queryFn: () =>
      api<AnalyticsBreakdown>(
        `/analytics/breakdown${accountId ? `?accountId=${accountId}` : ""}`,
      ),
    refetchInterval: 60_000,
  });
}

export function useCalendar(month: string, accountId?: string) {
  const params = new URLSearchParams({ month });
  if (accountId) params.set("accountId", accountId);
  return useQuery({
    queryKey: ["calendar", month, accountId ?? "all"],
    queryFn: () => api<CalendarDay[]>(`/analytics/calendar?${params}`),
  });
}
