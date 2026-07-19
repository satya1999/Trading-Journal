"use client";

import { useMutation, useAction } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import clsx from "clsx";
import {
  Cable,
  Download,
  Plus,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { useState } from "react";
import {
  Badge,
  Button,
  Card,
  CopyField,
  Dialog,
  Input,
  Skeleton,
  Spinner,
} from "@/components/ui";
import { EA_API_URL, fmtMoney } from "@/lib/api";
import { AccountWithLabel, useAccounts } from "@/lib/queries";

export default function AccountsPage() {
  const [wizard, setWizard] = useState<{ id: string; token: string } | null>(
    null,
  );
  const { data: accounts, isLoading } = useAccounts();

  const rotateTokenAction = useAction(api.accountsActions.rotateToken);
  const [reconnectingId, setReconnectingId] = useState<string | null>(null);

  const handleReconnect = async (id: any) => {
    setReconnectingId(id);
    try {
      const token = localStorage.getItem("tm_session_token") || "";
      const result = await rotateTokenAction({ token, id });
      setWizard({ id, token: result.syncToken });
    } catch (err) {
      console.error(err);
    } finally {
      setReconnectingId(null);
    }
  };

  const deleteAccount = useMutation(api.accounts.remove);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (id: any, label: string) => {
    if (confirm(`Delete "${label}" and all its synced trades? This cannot be undone.`)) {
      setDeletingId(id);
      try {
        const token = localStorage.getItem("tm_session_token") || "";
        await deleteAccount({ token, id });
      } catch (err) {
        console.error(err);
      } finally {
        setDeletingId(null);
      }
    }
  };

  const wizardAccount = accounts?.find((a) => a.id === wizard?.id);

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">MT5 accounts</h1>
          <p className="mt-0.5 text-sm text-ink-2">
            Connect once — every trade syncs itself from then on.
          </p>
        </div>
        <CreateAccountButton
          onCreated={(id, token) => setWizard({ id, token })}
        />
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
        </div>
      ) : !accounts?.length ? (
        <Card className="anim-fade-up flex flex-col items-center gap-3 py-12 text-center">
          <span className="grid size-12 place-items-center rounded-full bg-accent/12">
            <Cable className="size-6 text-accent" aria-hidden />
          </span>
          <div>
            <p className="font-medium">No MT5 account connected yet</p>
            <p className="mx-auto mt-1 max-w-sm text-sm text-ink-2">
              It takes about two minutes: we generate a tiny Expert Advisor
              pre-configured for your account — you drop it into MetaTrader and
              you're done.
            </p>
          </div>
          <CreateAccountButton
            onCreated={(id, token) => setWizard({ id, token })}
          />
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {accounts.map((a) => (
            <AccountRow
              key={a.id}
              account={a}
              reconnecting={reconnectingId === a.id}
              onReconnect={() => handleReconnect(a.id)}
              onDelete={() => handleDelete(a.id, a.label)}
            />
          ))}
        </div>
      )}

      {wizard && (
        <ConnectWizard
          token={wizard.token}
          account={wizardAccount}
          onClose={() => setWizard(null)}
        />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */

function CreateAccountButton({
  onCreated,
}: {
  onCreated: (id: string, token: string) => void;
}) {
  const [label, setLabel] = useState("");
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const createAccount = useAction(api.accountsActions.create);

  const handleCreate = async () => {
    setBusy(true);
    try {
      const token = localStorage.getItem("tm_session_token") || "";
      const result = await createAccount({ token, label });
      setOpen(false);
      setLabel("");
      onCreated(result.account.id, result.syncToken);
    } catch (err) {
      console.error(err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="size-4" aria-hidden />
        Connect MT5 account
      </Button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="Name this account"
        subtitle="A label you'll recognize — broker or challenge name works well."
      >
        <form
          className="flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            handleCreate();
          }}
        >
          <Input
            placeholder="e.g. FTMO 100k Challenge"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            autoFocus
          />
          <Button type="submit" disabled={busy}>
            {busy ? "Creating…" : "Continue to setup"}
          </Button>
        </form>
      </Dialog>
    </>
  );
}

/* ------------------------------------------------------------------ */

const STEPS: {
  title: string;
  body: (props: { token?: string }) => React.ReactNode;
}[] = [
  {
    title: "Download your personalized EA",
    body: DownloadStep,
  },
  {
    title: "Drop it into MetaTrader 5",
    body: () => (
      <p>
        In MT5: <b className="text-ink">File → Open Data Folder</b>, then open{" "}
        <b className="text-ink">MQL5 → Experts</b> and put the downloaded file
        there. Back in MT5, right-click{" "}
        <b className="text-ink">Expert Advisors</b> in the Navigator panel and
        hit <b className="text-ink">Refresh</b> — MT5 compiles it
        automatically.
      </p>
    ),
  },
  {
    title: "Allow the connection",
    body: () => (
      <div>
        <p>
          <b className="text-ink">Tools → Options → Expert Advisors</b>: tick{" "}
          <b className="text-ink">“Allow WebRequest for listed URL”</b>, add
          this exact address on a new line, and press OK:
        </p>
        <div className="mt-2">
          <CopyField value={EA_API_URL} />
        </div>
        <p className="mt-1.5 text-xs text-muted">
          Must be <code>127.0.0.1</code>, not <code>localhost</code> — MT5
          often can't resolve localhost.
        </p>
      </div>
    ),
  },
  {
    title: "Attach to any chart",
    body: () => (
      <p>
        Drag <b className="text-ink">TradeMindSync</b> from the Navigator onto
        any chart, keep <b className="text-ink">“Allow Algo Trading”</b>{" "}
        checked, and press OK — the URL and token are already filled in. Make
        sure the <b className="text-ink">Algo Trading</b> toolbar button is on.
        The EA reports its live status in the{" "}
        <b className="text-ink">top-left corner of the chart</b> — if anything
        is wrong, it says exactly what to fix.
      </p>
    ),
  },
];

const TROUBLESHOOTING: { q: string; a: React.ReactNode }[] = [
  {
    q: "The chart's top-left says “BLOCKED”",
    a: (
      <>
        The WebRequest whitelist is missing or doesn't match. Re-do step 3 with
        the exact address shown there, press OK, then re-attach the EA (or
        right-click the chart → Expert List → remove and drag it on again).
      </>
    ),
  },
  {
    q: "The chart's top-left says “connection failed”",
    a: (
      <>
        MT5 can't reach the TradeMind server. Check the server is running, and
        that the EA's <b className="text-ink">ApiUrl</b> input uses{" "}
        <code>http://127.0.0.1:4000</code> — press F7 on the chart to view the
        inputs. If you attached an older download, grab the file from step 1
        again (it has the correct URL baked in).
      </>
    ),
  },
  {
    q: "It says “REJECTED: token no longer valid”",
    a: (
      <>
        Every click on <b className="text-ink">Setup / Reconnect</b> issues a
        fresh token and kills the old one. Always use the EA downloaded in the
        <i> most recent</i> wizard, and delete older copies from{" "}
        <code>MQL5\Experts</code>.
      </>
    ),
  },
  {
    q: "No status text on the chart at all",
    a: (
      <>
        The EA isn't running: enable the{" "}
        <b className="text-ink">Algo Trading</b> toolbar button, and check the
        EA icon in the chart's top-right corner isn't greyed out. The{" "}
        <b className="text-ink">Experts</b> tab in the Toolbox (Ctrl+T) shows
        “TradeMind:” log lines with details.
      </>
    ),
  },
];

function ConnectWizard({
  token,
  account,
  onClose,
}: {
  token: string;
  account?: AccountWithLabel;
  onClose: () => void;
}) {
  const connected = account != null && account.status !== "pending";
  return (
    <Dialog
      open
      onClose={onClose}
      title="Connect your MT5 terminal"
      subtitle="Four quick steps — about two minutes."
      wide
    >
      <ol className="flex flex-col">
        {STEPS.map((step, i) => (
          <li key={step.title} className="relative flex gap-4 pb-6 last:pb-0">
            {i < STEPS.length - 1 && (
              <span
                aria-hidden
                className="absolute top-8 left-[13px] h-[calc(100%-2rem)] w-px bg-grid"
              />
            )}
            <span
              className="grid size-7 shrink-0 place-items-center rounded-full border border-accent/40 bg-accent/12 text-xs font-semibold text-accent"
              aria-hidden
            >
              {i + 1}
            </span>
            <div className="min-w-0 flex-1 pt-0.5">
              <h3 className="mb-1.5 text-sm font-semibold">{step.title}</h3>
              <div className="text-sm leading-relaxed text-ink-2">
                <step.body token={token} />
              </div>
            </div>
          </li>
        ))}
      </ol>

      <div
        className={clsx(
          "mt-5 flex items-center gap-3 rounded-xl border px-4 py-3",
          connected ? "border-good/40 bg-good/10" : "bg-black/25",
        )}
      >
        {connected ? (
          <>
            <span
              aria-hidden
              className="dot-online size-2.5 rounded-full bg-good"
            />
            <div className="flex-1 text-sm">
              <p className="font-medium text-good">Connected!</p>
              <p className="text-ink-2">
                {account?.broker} · #{account?.accountNumber} — trades are
                syncing now.
              </p>
            </div>
            <Button onClick={onClose}>Done</Button>
          </>
        ) : (
          <>
            <Spinner className="size-4" />
            <p className="flex-1 text-sm text-ink-2">
              Listening for the EA's first handshake — this box turns green the
              moment MT5 connects.
            </p>
          </>
        )}
      </div>

      {!connected && (
        <details className="mt-4 rounded-xl border px-4 py-3">
          <summary className="cursor-pointer text-sm font-medium text-ink-2 hover:text-ink">
            Not connecting? Read the chart's top-left corner
          </summary>
          <dl className="mt-3 flex flex-col gap-3">
            {TROUBLESHOOTING.map((item) => (
              <div key={item.q}>
                <dt className="text-sm font-medium">{item.q}</dt>
                <dd className="mt-0.5 text-sm leading-relaxed text-ink-2">
                  {item.a}
                </dd>
              </div>
            ))}
          </dl>
        </details>
      )}
    </Dialog>
  );
}

function DownloadStep({ token }: { token?: string }) {
  const [state, setState] = useState<"idle" | "busy" | "done" | "error">(
    "idle",
  );
  const [manual, setManual] = useState(false);

  async function download() {
    if (!token) return;
    setState("busy");
    try {
      // Personalize the EA template in the browser: the sync token is baked
      // into the input defaults and never sent anywhere except MT5 itself.
      const template = await fetch("/TradeMindSync.mq5").then((r) => {
        if (!r.ok) throw new Error("template fetch failed");
        return r.text();
      });
      const configured = template
        .replace(
          /(input\s+string\s+ApiUrl\s*=\s*)"[^"]*"/,
          `$1"${EA_API_URL}"`,
        )
        .replace(
          /(input\s+string\s+SyncToken\s*=\s*)"[^"]*"/,
          `$1"${token}"`,
        );
      const url = URL.createObjectURL(
        new Blob([configured], { type: "text/plain" }),
      );
      const a = document.createElement("a");
      a.href = url;
      a.download = "TradeMindSync.mq5";
      a.click();
      URL.revokeObjectURL(url);
      setState("done");
    } catch {
      setState("error");
    }
  }

  if (!token) {
    return (
      <p>
        This account's token was already issued. Use{" "}
        <b className="text-ink">Reconnect</b> on the account row to get a fresh
        pre-configured EA.
      </p>
    );
  }

  return (
    <div>
      <p>
        One file, already configured with your server address and private sync
        token — nothing to edit.
      </p>
      <div className="mt-2.5 flex flex-wrap items-center gap-2">
        <Button onClick={download} disabled={state === "busy"}>
          <Download className="size-4" aria-hidden />
          {state === "done"
            ? "Downloaded — download again"
            : "Download TradeMindSync.mq5"}
        </Button>
        <button
          type="button"
          onClick={() => setManual((m) => !m)}
          className="cursor-pointer text-xs text-muted underline-offset-2 hover:text-ink-2 hover:underline"
        >
          {manual ? "Hide token" : "Prefer manual setup? Show token"}
        </button>
      </div>
      {state === "error" && (
        <p className="mt-2 text-xs text-bad">
          Couldn't build the download — use the token below and set the EA
          inputs manually.
        </p>
      )}
      {(manual || state === "error") && (
        <div className="mt-3 flex flex-col gap-2">
          <CopyField label="Sync token (shown once)" value={token} />
          <CopyField label="API URL (use in the EA's ApiUrl input)" value={EA_API_URL} />
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */

function AccountRow({
  account: a,
  reconnecting,
  onReconnect,
  onDelete,
}: {
  account: AccountWithLabel;
  reconnecting: boolean;
  onReconnect: () => void;
  onDelete: () => void;
}) {
  return (
    <Card interactive className="anim-fade-up flex items-center gap-4 px-5">
      <span
        aria-hidden
        className={clsx(
          "size-2.5 shrink-0 rounded-full",
          a.status === "online" && "dot-online bg-good",
          a.status === "offline" && "bg-bad",
          a.status === "pending" && "bg-muted",
        )}
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate font-medium">{a.label}</p>
          {a.status === "online" ? (
            <Badge tone="good">online</Badge>
          ) : a.status === "offline" ? (
            <Badge tone="bad">EA offline</Badge>
          ) : (
            <Badge>waiting for EA</Badge>
          )}
        </div>
        <p className="mt-0.5 truncate text-sm text-ink-2">
          {a.broker ?? "Not connected yet"}
          {a.accountNumber ? ` · #${a.accountNumber}` : ""}
          {a.server ? ` · ${a.server}` : ""}
        </p>
      </div>
      <div className="shrink-0 text-right tabular-nums">
        <p className="text-sm font-semibold">{fmtMoney(a.balance, a.currency)}</p>
        <p className="text-xs text-muted">
          equity {fmtMoney(a.equity, a.currency)}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        <Button
          variant="ghost"
          size="sm"
          onClick={onReconnect}
          disabled={reconnecting}
          title="Issues a fresh token and reopens the setup guide"
        >
          <RefreshCw
            className={clsx("size-3.5", reconnecting && "animate-spin")}
            aria-hidden
          />
          {a.status === "pending" ? "Setup" : "Reconnect"}
        </Button>
        <Button variant="danger" size="sm" onClick={onDelete} aria-label="Delete account">
          <Trash2 className="size-3.5" aria-hidden />
        </Button>
      </div>
    </Card>
  );
}
