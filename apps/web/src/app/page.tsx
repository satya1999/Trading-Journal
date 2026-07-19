import { BarChart3, BrainCircuit, CalendarDays, Cable } from "lucide-react";
import Link from "next/link";
import { Logo } from "@/components/logo";

const FEATURES = [
  {
    icon: Cable,
    title: "Zero manual entry",
    body: "A tiny Expert Advisor syncs every MT5 trade, balance change, and open position automatically — you just trade.",
  },
  {
    icon: BarChart3,
    title: "Analytics that matter",
    body: "Equity curve, win rate, profit factor, R-multiples, drawdown — computed from your real fills, including partial closes.",
  },
  {
    icon: CalendarDays,
    title: "Journal every day",
    body: "A trading calendar and per-trade notes, strategies, and tags keep your review process honest.",
  },
  {
    icon: BrainCircuit,
    title: "AI coaching (soon)",
    body: "Per-trade scoring and behavioral insights land in the next milestone — the journal is already collecting what it needs.",
  },
];

export default function Landing() {
  return (
    <main className="relative min-h-screen overflow-hidden">
      {/* backdrop glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-48 left-1/2 h-96 w-[48rem] -translate-x-1/2 rounded-full bg-accent/15 blur-[120px]"
      />

      <header className="mx-auto flex max-w-5xl items-center justify-between px-6 py-6">
        <Logo />
        <nav className="flex items-center gap-2">
          <Link
            href="/login"
            className="rounded-lg px-4 py-2 text-sm font-medium text-ink-2 transition-colors hover:text-ink"
          >
            Sign in
          </Link>
          <Link
            href="/register"
            className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-deep"
          >
            Get started
          </Link>
        </nav>
      </header>

      <section className="mx-auto max-w-3xl px-6 pt-16 pb-20 text-center">
        <p className="glass anim-fade-up mb-4 inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium text-ink-2">
          <span className="size-1.5 rounded-full bg-good" aria-hidden />
          Auto-sync for MetaTrader 5 is live
        </p>
        <h1 className="anim-fade-up text-5xl leading-tight font-semibold tracking-tight text-balance">
          Trade once.{" "}
          <span className="bg-gradient-to-r from-accent to-[#7db4f0] bg-clip-text text-transparent">
            Learn forever.
          </span>
        </h1>
        <p className="anim-fade-up mx-auto mt-5 max-w-xl text-lg text-ink-2">
          The trading journal that fills itself. Connect your MT5 account in two
          minutes and every trade is captured, measured, and ready to review.
        </p>
        <div className="anim-fade-up mt-8 flex justify-center gap-3">
          <Link
            href="/register"
            className="rounded-lg bg-accent px-6 py-3 font-medium text-white shadow-[0_2px_16px_-4px] shadow-accent/60 transition-colors hover:bg-accent-deep"
          >
            Start journaling free
          </Link>
          <Link
            href="/login"
            className="rounded-lg border px-6 py-3 font-medium text-ink-2 transition-colors hover:border-baseline hover:text-ink"
          >
            Sign in
          </Link>
        </div>
      </section>

      <section className="mx-auto grid max-w-5xl gap-4 px-6 pb-24 sm:grid-cols-2">
        {FEATURES.map((f) => (
          <div
            key={f.title}
            className="glass glass-hover rounded-2xl p-5"
          >
            <f.icon className="size-5 text-accent" aria-hidden />
            <h2 className="mt-3 font-semibold">{f.title}</h2>
            <p className="mt-1.5 text-sm leading-relaxed text-ink-2">{f.body}</p>
          </div>
        ))}
      </section>

      <footer className="border-t py-6 text-center text-xs text-muted">
        TradeMind AI — your trades, remembered.
      </footer>
    </main>
  );
}
