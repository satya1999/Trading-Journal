"use client";

import { useAction, useQuery as useConvexQuery } from "convex/react";
import { useCallback } from "react";
import { api } from "../../convex/_generated/api";
import { TradingAccountDto, TradeDto, AnalyticsSummary, EquityPoint, AnalyticsBreakdown, CalendarDay } from "@trademind/shared";

export type AccountWithLabel = TradingAccountDto & { label: string };

export function useAccounts(options?: { refetchInterval?: number }) {
  const token = typeof window !== "undefined" ? localStorage.getItem("tm_session_token") ?? "" : "";
  const data = useConvexQuery(api.accounts.list, { token }) as AccountWithLabel[] | undefined;
  return { data, isLoading: data === undefined };
}

export interface TradesPage {
  total: number;
  page: number;
  pageSize: number;
  items: TradeDto[];
}

export function useTrades(filters: Record<string, string | number | undefined>) {
  const token = typeof window !== "undefined" ? localStorage.getItem("tm_session_token") ?? "" : "";
  const { accountId, symbol, state, page, pageSize } = filters;
  const data = useConvexQuery(api.trades.list, {
    token,
    accountId: accountId as string | undefined,
    symbol: symbol as string | undefined,
    state: state as string | undefined,
    paginationOpts: { page: Number(page) || 1, pageSize: Number(pageSize) || 25 },
  }) as TradesPage | undefined;
  return { data, isLoading: data === undefined };
}

export function useSummary(accountId?: string) {
  const token = typeof window !== "undefined" ? localStorage.getItem("tm_session_token") ?? "" : "";
  const data = useConvexQuery(api.analytics.summary, { token, accountId }) as AnalyticsSummary | undefined;
  return { data, isLoading: data === undefined };
}

export function useEquityCurve(accountId?: string) {
  const token = typeof window !== "undefined" ? localStorage.getItem("tm_session_token") ?? "" : "";
  const data = useConvexQuery(api.analytics.equityCurve, { token, accountId }) as { trades: EquityPoint[]; snapshots: EquityPoint[] } | undefined;
  return { data, isLoading: data === undefined };
}

export function useBreakdown(accountId?: string) {
  const token = typeof window !== "undefined" ? localStorage.getItem("tm_session_token") ?? "" : "";
  const data = useConvexQuery(api.analytics.breakdown, { token, accountId }) as AnalyticsBreakdown | undefined;
  return { data, isLoading: data === undefined };
}

export function useCalendar(month: string, accountId?: string) {
  const token = typeof window !== "undefined" ? localStorage.getItem("tm_session_token") ?? "" : "";
  const data = useConvexQuery(api.analytics.calendar, { token, month, accountId }) as CalendarDay[] | undefined;
  return { data, isLoading: data === undefined };
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  at: number;
}

export function useChatHistory(accountId?: string) {
  const token = typeof window !== "undefined" ? localStorage.getItem("tm_session_token") ?? "" : "";
  const data = useConvexQuery(
    api.chat.history,
    token ? { token, accountId } : "skip",
  ) as ChatMessage[] | undefined;
  return { data, isLoading: data === undefined };
}

export function useChatSend() {
  const sendAction = useAction(api.chat.send);
  return useCallback(
    async (message: string, accountId?: string) => {
      const token = localStorage.getItem("tm_session_token") || "";
      return sendAction({ token, message, accountId });
    },
    [sendAction],
  );
}

export function useChatClear() {
  const clearAction = useAction(api.chat.clearChat);
  return useCallback(async () => {
    const token = localStorage.getItem("tm_session_token") || "";
    return clearAction({ token });
  }, [clearAction]);
}
