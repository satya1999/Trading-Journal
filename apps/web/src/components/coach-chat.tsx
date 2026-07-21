"use client";

import { Bot, Loader2, Send, Sparkles, Trash2, User } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useChatClear, useChatHistory, useChatSend } from "@/lib/queries";
import { Button } from "@/components/ui";

const STARTERS = [
  "What's the single biggest thing hurting my P/L right now?",
  "Am I sizing my trades consistently?",
  "Should I be worried about my current streak?",
  "What would you focus on improving this week?",
];

export function CoachChat({
  accountId,
  draft,
  onDraftChange,
  panelRef,
}: {
  accountId?: string;
  draft: string;
  onDraftChange: (v: string) => void;
  panelRef?: React.Ref<HTMLDivElement>;
}) {
  const { data: history, isLoading } = useChatHistory(accountId);
  const send = useChatSend();
  const clearChat = useChatClear();
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [history, pending]);

  async function handleSend(text?: string) {
    const message = (text ?? draft).trim();
    if (!message || sending) return;
    setError(null);
    setPending(message);
    onDraftChange("");
    setSending(true);
    try {
      await send(message, accountId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong — try again.");
    } finally {
      setSending(false);
      setPending(null);
    }
  }

  async function handleClear() {
    if (!confirm("Clear the whole coach conversation?")) return;
    try {
      await clearChat();
    } catch {
      // best-effort
    }
  }

  const empty = !isLoading && (!history || history.length === 0) && !pending;

  return (
    <div ref={panelRef} className="glass flex h-[560px] flex-col rounded-2xl">
      <div className="flex items-center justify-between border-b border-white/8 px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="grid size-7 place-items-center rounded-lg bg-accent/15 text-accent">
            <Sparkles className="size-4" aria-hidden />
          </span>
          <div>
            <p className="text-sm font-semibold">AI Coach</p>
            <p className="text-[11px] text-muted">Grounded in your real trade data</p>
          </div>
        </div>
        {!empty && (
          <button
            type="button"
            onClick={handleClear}
            className="flex items-center gap-1 text-xs text-muted transition-colors hover:text-bad"
            aria-label="Clear conversation"
          >
            <Trash2 className="size-3.5" aria-hidden />
            Clear
          </button>
        )}
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3">
        {isLoading ? (
          <div className="flex h-full items-center justify-center text-sm text-muted">
            Loading conversation…
          </div>
        ) : empty ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 px-4 text-center">
            <span className="grid size-11 place-items-center rounded-full bg-accent/12">
              <Bot className="size-5 text-accent" aria-hidden />
            </span>
            <p className="text-sm text-ink-2">
              Ask about your performance — the coach sees your win rate, streaks,
              costs, and every insight already on this page.
            </p>
            <div className="flex flex-col gap-1.5">
              {STARTERS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => handleSend(s)}
                  className="glass glass-hover rounded-lg px-3 py-1.5 text-left text-xs text-ink-2 hover:text-ink"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {history?.map((m) => <Bubble key={m.id} role={m.role} content={m.content} />)}
            {pending && <Bubble role="user" content={pending} />}
            {sending && (
              <div className="flex items-center gap-2 text-xs text-muted">
                <Loader2 className="size-3.5 animate-spin" aria-hidden />
                Coach is thinking…
              </div>
            )}
          </div>
        )}
        {error && (
          <p className="mt-3 rounded-lg border border-bad/30 bg-bad/8 px-3 py-2 text-xs leading-relaxed text-bad">
            {error}
          </p>
        )}
      </div>

      <form
        className="flex items-center gap-2 border-t border-white/8 p-3"
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
      >
        <input
          value={draft}
          onChange={(e) => onDraftChange(e.target.value)}
          placeholder="Ask the coach about your trading…"
          disabled={sending}
          className="min-w-0 flex-1 rounded-lg border bg-white/5 px-3 py-2 text-sm text-ink backdrop-blur-sm placeholder:text-muted focus:border-accent focus:outline-none disabled:opacity-60"
        />
        <Button type="submit" disabled={sending || !draft.trim()} className="shrink-0 px-3">
          {sending ? (
            <Loader2 className="size-4 animate-spin" aria-hidden />
          ) : (
            <Send className="size-4" aria-hidden />
          )}
        </Button>
      </form>
    </div>
  );
}

function Bubble({ role, content }: { role: "user" | "assistant"; content: string }) {
  const isUser = role === "user";
  return (
    <div className={`flex items-start gap-2 ${isUser ? "flex-row-reverse" : ""}`}>
      <span
        className={`mt-0.5 grid size-6 shrink-0 place-items-center rounded-full ${
          isUser ? "bg-accent/20 text-accent" : "bg-white/8 text-ink-2"
        }`}
        aria-hidden
      >
        {isUser ? <User className="size-3.5" /> : <Bot className="size-3.5" />}
      </span>
      <div
        className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed whitespace-pre-wrap ${
          isUser ? "rounded-tr-sm bg-accent text-white" : "rounded-tl-sm bg-white/6 text-ink"
        }`}
      >
        {content}
      </div>
    </div>
  );
}
