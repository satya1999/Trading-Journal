"use client";

import { useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { TradeDto } from "@trademind/shared";
import clsx from "clsx";
import { ChevronLeft, ChevronRight, NotebookPen, Tag } from "lucide-react";
import { useState } from "react";
import {
  Badge,
  Button,
  Card,
  DirectionBadge,
  Input,
  Select,
  Skeleton,
} from "@/components/ui";
import { fmtDuration, fmtNum, fmtSigned } from "@/lib/api";
import { useAccounts, useTrades } from "@/lib/queries";

export default function TradesPage() {
  const { data: accounts } = useAccounts();
  const [accountId, setAccountId] = useState("");
  const [symbol, setSymbol] = useState("");
  const [state, setState] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<TradeDto | null>(null);

  const { data, isLoading } = useTrades({
    accountId,
    symbol,
    state,
    page,
    pageSize: 25,
  });
  const pages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  return (
    <div className="mx-auto max-w-6xl">
      <h1 className="text-2xl font-semibold">Trade journal</h1>
      <p className="mt-0.5 mb-5 text-sm text-ink-2">
        Every synced trade — click a row to review and annotate it.
      </p>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Select
          value={accountId}
          onChange={(e) => {
            setAccountId(e.target.value);
            setPage(1);
          }}
          aria-label="Account"
        >
          <option value="">All accounts</option>
          {accounts?.map((a) => (
            <option key={a.id} value={a.id}>
              {a.label}
            </option>
          ))}
        </Select>
        <Input
          placeholder="Filter symbol… (e.g. XAUUSD)"
          value={symbol}
          onChange={(e) => {
            setSymbol(e.target.value.trim());
            setPage(1);
          }}
          className="w-52"
          aria-label="Symbol"
        />
        <Select
          value={state}
          onChange={(e) => {
            setState(e.target.value);
            setPage(1);
          }}
          aria-label="State"
        >
          <option value="">Open + closed</option>
          <option value="open">Open</option>
          <option value="closed">Closed</option>
        </Select>
        {data && (
          <span className="ml-auto text-sm text-muted tabular-nums">
            {data.total} trades
          </span>
        )}
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-2">
          <Skeleton className="h-10" />
          <Skeleton className="h-64" />
        </div>
      ) : !data?.items.length ? (
        <Card className="py-12 text-center text-ink-2">
          No trades match. Connect an account and they'll appear here on their
          own.
        </Card>
      ) : (
        <Card className="overflow-x-auto p-0">
          <table className="w-full text-sm tabular-nums">
            <thead>
              <tr className="border-b bg-white/[0.03] text-left text-[11px] tracking-wide text-muted uppercase">
                <th className="px-4 py-2.5 font-medium">Symbol</th>
                <th className="px-2 py-2.5 font-medium">Side</th>
                <th className="px-2 py-2.5 font-medium">Lots</th>
                <th className="px-2 py-2.5 font-medium">Entry</th>
                <th className="px-2 py-2.5 font-medium">Exit</th>
                <th className="px-2 py-2.5 text-right font-medium">Pips</th>
                <th className="px-2 py-2.5 text-right font-medium">R</th>
                <th className="px-2 py-2.5 text-right font-medium">Net P/L</th>
                <th className="px-2 py-2.5 font-medium">Duration</th>
                <th className="px-4 py-2.5 font-medium">Opened</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((t) => (
                <tr
                  key={t.id}
                  onClick={() => setSelected(t)}
                  className="cursor-pointer border-b border-grid transition-colors last:border-0 hover:bg-surface-2/60"
                >
                  <td className="px-4 py-2.5">
                    <span className="flex items-center gap-2 font-medium">
                      {t.symbol}
                      {t.state === "open" && <Badge tone="accent">open</Badge>}
                      {t.note &&
                        (t.note.note || t.note.strategy || t.note.tags.length > 0) && (
                          <NotebookPen
                            className="size-3.5 text-muted"
                            aria-label="Has journal notes"
                          />
                        )}
                    </span>
                  </td>
                  <td className="px-2 py-2.5">
                    <DirectionBadge direction={t.direction} />
                  </td>
                  <td className="px-2 py-2.5">{t.volume}</td>
                  <td className="px-2 py-2.5">{t.entryPrice}</td>
                  <td className="px-2 py-2.5">{t.exitPrice ?? "—"}</td>
                  <td className="px-2 py-2.5 text-right">{fmtNum(t.pips, 1)}</td>
                  <td className="px-2 py-2.5 text-right">{fmtNum(t.rr)}</td>
                  <td
                    className={clsx(
                      "px-2 py-2.5 text-right font-semibold",
                      t.netProfit > 0 && "text-good",
                      t.netProfit < 0 && "text-bad",
                    )}
                  >
                    {fmtSigned(t.netProfit)}
                  </td>
                  <td className="px-2 py-2.5 text-ink-2">
                    {fmtDuration(t.durationSec)}
                  </td>
                  <td className="px-4 py-2.5 text-ink-2">
                    {new Date(t.openTime).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {pages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-3 text-sm">
          <Button
            variant="ghost"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            <ChevronLeft className="size-4" aria-hidden /> Prev
          </Button>
          <span className="text-ink-2 tabular-nums">
            {page} / {pages}
          </span>
          <Button
            variant="ghost"
            size="sm"
            disabled={page >= pages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next <ChevronRight className="size-4" aria-hidden />
          </Button>
        </div>
      )}

      {selected && (
        <TradeDrawer trade={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 border-b border-grid py-1.5 text-sm last:border-0">
      <span className="text-muted">{label}</span>
      <span className="text-right tabular-nums">{value}</span>
    </div>
  );
}

function TradeDrawer({
  trade,
  onClose,
}: {
  trade: TradeDto;
  onClose: () => void;
}) {
  const saveNote = useMutation(api.trades.upsertNote);
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSave = async () => {
    setBusy(true);
    setSuccess(false);
    try {
      const token = localStorage.getItem("tm_session_token") || "";
      await saveNote({
        token,
        tradeId: trade.id as any,
        note: note || null,
        strategy: strategy || null,
        setup: setup || null,
        tags: tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
      });
      setSuccess(true);
    } catch (err) {
      console.error(err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-40 flex justify-end bg-black/60 backdrop-blur-[2px]"
      onClick={onClose}
    >
      <aside
        className="glass-strong anim-slide-in h-full w-full max-w-md overflow-y-auto border-l p-6"
        onClick={(e) => e.stopPropagation()}
        aria-label={`Trade ${trade.symbol} #${trade.ticket}`}
      >
        <div className="mb-5 flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold">{trade.symbol}</h2>
              <DirectionBadge direction={trade.direction} />
              {trade.state === "open" && <Badge tone="accent">open</Badge>}
            </div>
            <p className="mt-0.5 text-xs text-muted">Ticket #{trade.ticket}</p>
          </div>
          <p
            className={clsx(
              "text-2xl font-semibold tabular-nums",
              trade.netProfit > 0 && "text-good",
              trade.netProfit < 0 && "text-bad",
            )}
          >
            {fmtSigned(trade.netProfit)}
          </p>
        </div>

        <div className="mb-6 rounded-xl border bg-black/25 px-4 py-2">
          <Row label="Volume" value={`${trade.volume} lots`} />
          <Row label="Entry" value={trade.entryPrice} />
          <Row label="Exit" value={trade.exitPrice ?? "—"} />
          <Row label="Stop loss" value={trade.sl ?? "—"} />
          <Row label="Take profit" value={trade.tp ?? "—"} />
          <Row label="Pips" value={fmtNum(trade.pips, 1)} />
          <Row label="R multiple" value={fmtNum(trade.rr)} />
          <Row label="Commission" value={fmtSigned(trade.commission)} />
          <Row label="Swap" value={fmtSigned(trade.swap)} />
          <Row label="Duration" value={fmtDuration(trade.durationSec)} />
          <Row label="Opened" value={new Date(trade.openTime).toLocaleString()} />
          <Row
            label="Closed"
            value={
              trade.closeTime ? new Date(trade.closeTime).toLocaleString() : "—"
            }
          />
        </div>

        <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-ink-2">
          <NotebookPen className="size-4" aria-hidden /> Journal
        </h3>
        <form
          className="flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            handleSave();
          }}
        >
          <Input
            placeholder="Strategy (e.g. London breakout)"
            value={strategy}
            onChange={(e) => setStrategy(e.target.value)}
          />
          <Input
            placeholder="Setup (e.g. OB retest + FVG)"
            value={setup}
            onChange={(e) => setSetup(e.target.value)}
          />
          <div className="relative">
            <Tag
              className="absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-muted"
              aria-hidden
            />
            <Input
              placeholder="Tags, comma separated"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              className="pl-8"
            />
          </div>
          <textarea
            placeholder="What happened? What did you feel? What would you repeat or avoid?"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={5}
            className="w-full rounded-lg border bg-white/5 px-3 py-2 text-sm text-ink backdrop-blur-sm transition-colors placeholder:text-muted hover:border-baseline focus:border-accent focus:outline-none"
          />
          <div className="flex items-center gap-3">
            <Button type="submit" disabled={busy}>
              {busy ? "Saving…" : "Save journal"}
            </Button>
            {success && !busy && (
              <span className="text-sm text-good">Saved ✓</span>
            )}
          </div>
        </form>
      </aside>
    </div>
  );

  return (
    <div
      className="fixed inset-0 z-40 flex justify-end bg-black/60 backdrop-blur-[2px]"
      onClick={onClose}
    >
      <aside
        className="glass-strong anim-slide-in h-full w-full max-w-md overflow-y-auto border-l p-6"
        onClick={(e) => e.stopPropagation()}
        aria-label={`Trade ${trade.symbol} #${trade.ticket}`}
      >
        <div className="mb-5 flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold">{trade.symbol}</h2>
              <DirectionBadge direction={trade.direction} />
              {trade.state === "open" && <Badge tone="accent">open</Badge>}
            </div>
            <p className="mt-0.5 text-xs text-muted">Ticket #{trade.ticket}</p>
          </div>
          <p
            className={clsx(
              "text-2xl font-semibold tabular-nums",
              trade.netProfit > 0 && "text-good",
              trade.netProfit < 0 && "text-bad",
            )}
          >
            {fmtSigned(trade.netProfit)}
          </p>
        </div>

        <div className="mb-6 rounded-xl border bg-black/25 px-4 py-2">
          <Row label="Volume" value={`${trade.volume} lots`} />
          <Row label="Entry" value={trade.entryPrice} />
          <Row label="Exit" value={trade.exitPrice ?? "—"} />
          <Row label="Stop loss" value={trade.sl ?? "—"} />
          <Row label="Take profit" value={trade.tp ?? "—"} />
          <Row label="Pips" value={fmtNum(trade.pips, 1)} />
          <Row label="R multiple" value={fmtNum(trade.rr)} />
          <Row label="Commission" value={fmtSigned(trade.commission)} />
          <Row label="Swap" value={fmtSigned(trade.swap)} />
          <Row label="Duration" value={fmtDuration(trade.durationSec)} />
          <Row label="Opened" value={new Date(trade.openTime).toLocaleString()} />
          <Row
            label="Closed"
            value={
              trade.closeTime ? new Date(trade.closeTime).toLocaleString() : "—"
            }
          />
        </div>

        <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-ink-2">
          <NotebookPen className="size-4" aria-hidden /> Journal
        </h3>
        <form
          className="flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            save.mutate();
          }}
        >
          <Input
            placeholder="Strategy (e.g. London breakout)"
            value={strategy}
            onChange={(e) => setStrategy(e.target.value)}
          />
          <Input
            placeholder="Setup (e.g. OB retest + FVG)"
            value={setup}
            onChange={(e) => setSetup(e.target.value)}
          />
          <div className="relative">
            <Tag
              className="absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-muted"
              aria-hidden
            />
            <Input
              placeholder="Tags, comma separated"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              className="pl-8"
            />
          </div>
          <textarea
            placeholder="What happened? What did you feel? What would you repeat or avoid?"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={5}
            className="w-full rounded-lg border bg-white/5 px-3 py-2 text-sm text-ink backdrop-blur-sm transition-colors placeholder:text-muted hover:border-baseline focus:border-accent focus:outline-none"
          />
          <div className="flex items-center gap-3">
            <Button type="submit" disabled={save.isPending}>
              {save.isPending ? "Saving…" : "Save journal"}
            </Button>
            {save.isSuccess && !save.isPending && (
              <span className="text-sm text-good">Saved ✓</span>
            )}
          </div>
        </form>
      </aside>
    </div>
  );
}
