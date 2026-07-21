import { v } from "convex/values";
import { action, internalMutation, internalQuery, query } from "./_generated/server";
import { internal, api } from "./_generated/api";
import { getSessionUser } from "./auth";

const HISTORY_LIMIT = 40;
const DEFAULT_MODEL = "claude-sonnet-5";

// Public: chat history for the current user (optionally scoped to one account)
export const history = query({
  args: {
    token: v.string(),
    accountId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getSessionUser(ctx, args.token);
    if (!user) throw new Error("Unauthorized");

    const all = await ctx.db
      .query("chatMessages")
      .withIndex("by_user_at", (q) => q.eq("userId", user._id))
      .order("desc")
      .take(HISTORY_LIMIT);

    const scoped = args.accountId
      ? all.filter((m) => m.accountId === args.accountId)
      : all;

    return scoped
      .reverse()
      .map((m) => ({ id: m._id, role: m.role, content: m.content, at: m.at }));
  },
});

// Public: wipe this user's coach chat (fresh start)
export const clear = internalMutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const msgs = await ctx.db
      .query("chatMessages")
      .withIndex("by_user_at", (q) => q.eq("userId", args.userId))
      .collect();
    await Promise.all(msgs.map((m) => ctx.db.delete(m._id)));
  },
});

export const clearChat = action({
  args: { token: v.string() },
  handler: async (ctx, args): Promise<{ ok: true }> => {
    const user = (await ctx.runQuery(api.auth.me, { token: args.token })) as {
      id: string;
    } | null;
    if (!user) throw new Error("Unauthorized");
    await ctx.runMutation(internal.chat.clear, { userId: user.id as any });
    return { ok: true };
  },
});

// Internal: append one message (used only by the `send` action below)
export const append = internalMutation({
  args: {
    userId: v.id("users"),
    accountId: v.optional(v.string()),
    role: v.union(v.literal("user"), v.literal("assistant")),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("chatMessages", {
      ...args,
      accountId: args.accountId as any,
      at: Date.now(),
    });
  },
});

// Internal: last N messages as plain objects, for building the model prompt
export const recentForPrompt = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const msgs = await ctx.db
      .query("chatMessages")
      .withIndex("by_user_at", (q) => q.eq("userId", args.userId))
      .order("desc")
      .take(12);
    return msgs.reverse().map((m) => ({ role: m.role, content: m.content }));
  },
});

function buildSystemPrompt(summary: any, breakdown: any): string {
  const fmt = (n: number | null | undefined) =>
    n == null ? "n/a" : (Math.round(n * 100) / 100).toString();

  const topInsights = (breakdown.insights ?? [])
    .slice(0, 6)
    .map((i: any) => `- [${i.tone}] ${i.title}: ${i.body}`)
    .join("\n");

  const topSymbols = (breakdown.bySymbol ?? [])
    .slice(0, 5)
    .map(
      (s: any) =>
        `${s.symbol}: ${fmt(s.pnl)} net over ${s.trades} trades (${s.trades ? Math.round((s.wins / s.trades) * 100) : 0}% win)`,
    )
    .join("; ");

  return `You are the TradeMind AI coach — a blunt, data-grounded trading performance coach embedded in a trading journal app. You are talking directly to the trader whose data is below. Never invent numbers; only reference the figures given here. Never recommend specific future trades, symbols to buy/sell, or price predictions — you coach behavior, risk management, and discipline, not market calls. Be concise (short paragraphs, no walls of text), specific (cite their real numbers), and direct — agree when something is working, don't soften bad news.

TRADER'S PERFORMANCE SNAPSHOT
- Closed trades: ${breakdown.closedTrades}
- Win rate: ${fmt(summary.winRate)}%
- Profit factor: ${fmt(summary.profitFactor)}
- Net profit: ${fmt(summary.netProfit)}
- Max drawdown: ${fmt(summary.maxDrawdown)}
- Avg R multiple: ${fmt(summary.avgRR)}
- Expectancy per trade: ${fmt(breakdown.expectancy)}
- Avg win / avg loss: ${fmt(breakdown.avgWin)} / ${fmt(breakdown.avgLoss)}
- % trades without a stop loss: ${fmt(breakdown.noSlPct)}
- Win streak (best/current): ${breakdown.streaks?.maxWinStreak ?? "n/a"} / ${breakdown.streaks?.currentStreak ?? "n/a"}
- Loss streak (worst): ${breakdown.streaks?.maxLossStreak ?? "n/a"}

TOP SYMBOLS: ${topSymbols || "not enough data yet"}

RULE-BASED INSIGHTS ALREADY SURFACED TO THE TRADER (you may expand on these, don't just repeat them verbatim):
${topInsights || "none yet — not enough closed trades"}

Answer the trader's question using this context. If they ask something the data can't answer, say so plainly instead of guessing.`;
}

export const send = action({
  args: {
    token: v.string(),
    message: v.string(),
    accountId: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<{ reply: string }> => {
    const user = (await ctx.runQuery(api.auth.me, { token: args.token })) as {
      id: string;
    } | null;
    if (!user) throw new Error("Unauthorized");

    const message = args.message.trim().slice(0, 2000);
    if (!message) throw new Error("Message is empty");

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error(
        "AI coach isn't configured yet. Run: npx convex env set ANTHROPIC_API_KEY sk-ant-... (from apps/web) and try again.",
      );
    }

    const [summary, breakdown, history] = await Promise.all([
      ctx.runQuery(api.analytics.summary, {
        token: args.token,
        accountId: args.accountId,
      }),
      ctx.runQuery(api.analytics.breakdown, {
        token: args.token,
        accountId: args.accountId,
      }),
      ctx.runQuery(internal.chat.recentForPrompt, { userId: user.id as any }),
    ]);

    await ctx.runMutation(internal.chat.append, {
      userId: user.id as any,
      accountId: args.accountId,
      role: "user",
      content: message,
    });

    const system = buildSystemPrompt(summary, breakdown);
    const model = process.env.ANTHROPIC_MODEL || DEFAULT_MODEL;

    const resp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model,
        max_tokens: 700,
        system,
        messages: [...history, { role: "user", content: message }],
      }),
    });

    if (!resp.ok) {
      const errText = await resp.text().catch(() => "");
      throw new Error(`AI coach request failed (${resp.status}): ${errText.slice(0, 300)}`);
    }

    const data = (await resp.json()) as {
      content?: { type: string; text?: string }[];
    };
    const reply =
      data.content
        ?.filter((b) => b.type === "text")
        .map((b) => b.text)
        .join("\n")
        .trim() || "I couldn't generate a response — try rephrasing that.";

    await ctx.runMutation(internal.chat.append, {
      userId: user.id as any,
      accountId: args.accountId,
      role: "assistant",
      content: reply,
    });

    return { reply };
  },
});
