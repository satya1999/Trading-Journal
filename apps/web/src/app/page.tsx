"use client";

import {
  ArrowRight,
  BarChart3,
  BrainCircuit,
  Cable,
  CalendarDays,
  NotebookPen,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";
import { Icon3D, Reveal, Tilt } from "@/components/fx";
import { Logo } from "@/components/logo";

const FEATURES = [
  {
    icon: Cable,
    hue: "blue" as const,
    title: "Zero manual entry",
    body: "A tiny Expert Advisor syncs every MT5 trade, balance change, and open position automatically — you just trade.",
  },
  {
    icon: BarChart3,
    hue: "violet" as const,
    title: "Analytics that matter",
    body: "Equity curve, win rate, profit factor, R-multiples, drawdown — computed from your real fills, including partial closes.",
  },
  {
    icon: BrainCircuit,
    hue: "magenta" as const,
    title: "Insights, not just numbers",
    body: "Your worst weekday, your golden hours, the symbol bleeding money — surfaced automatically from your own data.",
  },
  {
    icon: CalendarDays,
    hue: "green" as const,
    title: "Calendar you'll actually review",
    body: "Every day colored by result. Click any day and replay exactly what happened — and what you were thinking.",
  },
  {
    icon: NotebookPen,
    hue: "orange" as const,
    title: "Journal every trade",
    body: "Strategies, setups, tags and notes attached to real fills. Your playbook's true win rate, not your memory of it.",
  },
  {
    icon: ShieldCheck,
    hue: "yellow" as const,
    title: "Risk discipline, measured",
    body: "Trades without stops, oversized losers, revenge-trading days — the journal catches what emotions hide.",
  },
];

const STEPS = [
  {
    n: "01",
    title: "Connect MT5 in two minutes",
    body: "Download a pre-configured Expert Advisor — your sync token is already baked in. Drop it on any chart.",
  },
  {
    n: "02",
    title: "Trade like you always do",
    body: "Every fill, partial close, and balance change streams into your journal in real time. Nothing to upload, ever.",
  },
  {
    n: "03",
    title: "Review, learn, improve",
    body: "Dashboards, calendars and insights turn raw fills into patterns — so next month's trading is sharper than last month's.",
  },
];

export default function Landing() {
  return (
    <main className="relative min-h-screen overflow-x-clip">
      {/* drifting glow orbs */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <span className="orb left-[8%] top-[-6rem] h-[26rem] w-[34rem] bg-accent/25" />
        <span
          className="orb right-[-8rem] top-[16rem] h-[22rem] w-[26rem] bg-[#9085e9]/20"
          style={{ animationDelay: "-6s" }}
        />
        <span
          className="orb bottom-[-8rem] left-[35%] h-[20rem] w-[30rem] bg-[#1baf7a]/15"
          style={{ animationDelay: "-11s" }}
        />
      </div>

      {/* nav */}
      <header className="sticky top-0 z-40 border-b border-white/5 bg-plane/60 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3.5">
          <Logo />
          <nav className="hidden items-center gap-6 text-sm text-ink-2 md:flex">
            <a href="#features" className="transition-colors hover:text-ink">
              Features
            </a>
            <a href="#how" className="transition-colors hover:text-ink">
              How it works
            </a>
            <a href="#analytics" className="transition-colors hover:text-ink">
              Analytics
            </a>
          </nav>
          <div className="flex items-center gap-2">
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
          </div>
        </div>
      </header>

      {/* hero */}
      <section className="mx-auto max-w-6xl px-6 pt-20 pb-10 text-center">
        <Reveal>
          <p className="glass mx-auto mb-5 inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-medium text-ink-2">
            <span className="dot-online size-1.5 rounded-full bg-good" aria-hidden />
            Live auto-sync for MetaTrader 5
          </p>
        </Reveal>
        <Reveal delay={80}>
          <h1 className="mx-auto max-w-3xl text-5xl leading-[1.08] font-semibold tracking-tight text-balance md:text-6xl">
            Trade once.{" "}
            <span className="text-gradient-animated">Learn forever.</span>
          </h1>
        </Reveal>
        <Reveal delay={160}>
          <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-ink-2">
            The trading journal that fills itself. Connect your MT5 account in
            two minutes — every trade is captured, measured, and turned into
            lessons.
          </p>
        </Reveal>
        <Reveal delay={240}>
          <div className="mt-9 flex justify-center gap-3">
            <Link
              href="/register"
              className="group inline-flex items-center gap-2 rounded-xl bg-accent px-6 py-3 font-medium text-white shadow-[0_4px_24px_-6px] shadow-accent/60 transition-all hover:bg-accent-deep hover:shadow-[0_6px_32px_-6px] hover:shadow-accent/70"
            >
              Start journaling free
              <ArrowRight
                className="size-4 transition-transform group-hover:translate-x-0.5"
                aria-hidden
              />
            </Link>
            <a
              href="#how"
              className="glass glass-hover rounded-xl px-6 py-3 font-medium text-ink-2 hover:text-ink"
            >
              See how it works
            </a>
          </div>
        </Reveal>

        {/* 3D dashboard mock */}
        <Reveal delay={340} className="mt-16">
          <Tilt max={6} className="mx-auto max-w-3xl">
            <div className="float-slow">
              <DashboardMock />
            </div>
          </Tilt>
        </Reveal>
      </section>

      {/* features */}
      <section id="features" className="mx-auto max-w-6xl scroll-mt-20 px-6 py-20">
        <Reveal>
          <h2 className="text-center text-3xl font-semibold tracking-tight">
            Everything a disciplined trader needs
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-center text-ink-2">
            Built around one idea: the truth about your trading is already in
            your fills — you just need to see it.
          </p>
        </Reveal>
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f, i) => (
            <Reveal key={f.title} delay={i * 70}>
              <div className="group glass glass-hover h-full rounded-2xl p-6">
                <Icon3D icon={f.icon} hue={f.hue} />
                <h3 className="mt-4 font-semibold">{f.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-ink-2">
                  {f.body}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* how it works */}
      <section id="how" className="mx-auto max-w-6xl scroll-mt-20 px-6 py-16">
        <Reveal>
          <h2 className="text-center text-3xl font-semibold tracking-tight">
            From install to insight in one session
          </h2>
        </Reveal>
        <ol className="mt-12 grid gap-4 md:grid-cols-3">
          {STEPS.map((s, i) => (
            <Reveal key={s.n} delay={i * 120} as="li">
              <div className="glass glass-hover relative h-full overflow-hidden rounded-2xl p-6">
                <span
                  aria-hidden
                  className="pointer-events-none absolute -top-4 -right-2 text-7xl font-bold text-white/[0.05]"
                >
                  {s.n}
                </span>
                <span className="text-sm font-semibold text-accent">{s.n}</span>
                <h3 className="mt-2 font-semibold">{s.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-ink-2">
                  {s.body}
                </p>
              </div>
            </Reveal>
          ))}
        </ol>
      </section>

      {/* analytics showcase */}
      <section id="analytics" className="mx-auto max-w-6xl scroll-mt-20 px-6 py-16">
        <div className="grid items-center gap-10 lg:grid-cols-2">
          <Reveal>
            <div>
              <h2 className="text-3xl font-semibold tracking-tight">
                Your coach is your own data
              </h2>
              <p className="mt-4 leading-relaxed text-ink-2">
                TradeMind studies every closed trade and tells you things a
                mentor would: which session you should own, which weekday to
                sit out, whether your losers are quietly twice the size of your
                winners.
              </p>
              <ul className="mt-6 flex flex-col gap-3 text-sm text-ink-2">
                {[
                  "P/L by hour, weekday, session, symbol and holding time",
                  "R-multiple distribution and stop-loss discipline tracking",
                  "Strategy & setup win rates from your journal tags",
                  "Plain-language insights ranked by how much they cost you",
                ].map((t) => (
                  <li key={t} className="flex items-start gap-2.5">
                    <span
                      aria-hidden
                      className="mt-1.5 size-1.5 shrink-0 rounded-full bg-accent"
                    />
                    {t}
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>
          <Reveal delay={150}>
            <Tilt max={7}>
              <AnalyticsMock />
            </Tilt>
          </Reveal>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-4xl px-6 py-20">
        <Reveal>
          <div className="glass relative overflow-hidden rounded-3xl p-10 text-center">
            <span
              aria-hidden
              className="orb left-1/2 top-[-6rem] h-[16rem] w-[24rem] -translate-x-1/2 bg-accent/25"
            />
            <h2 className="text-3xl font-semibold tracking-tight">
              Your next 100 trades deserve a memory
            </h2>
            <p className="mx-auto mt-3 max-w-md text-ink-2">
              Free to start. Two minutes to connect. Every trade after that
              journals itself.
            </p>
            <Link
              href="/register"
              className="mt-7 inline-flex items-center gap-2 rounded-xl bg-accent px-7 py-3 font-medium text-white shadow-[0_4px_24px_-6px] shadow-accent/60 transition-colors hover:bg-accent-deep"
            >
              Create your free account
              <ArrowRight className="size-4" aria-hidden />
            </Link>
          </div>
        </Reveal>
      </section>

      <footer className="border-t border-white/5 py-8 text-center text-xs text-muted">
        TradeMind AI — your trades, remembered.
      </footer>
    </main>
  );
}

/* ---- hero / showcase mockups (pure CSS + SVG, no assets) ----------- */

function DashboardMock() {
  return (
    <div className="glass-strong rounded-2xl p-5 text-left shadow-2xl">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-1.5" aria-hidden>
          <span className="size-2.5 rounded-full bg-bad/70" />
          <span className="size-2.5 rounded-full bg-[#fab219]/70" />
          <span className="size-2.5 rounded-full bg-good/70" />
        </div>
        <span className="text-xs text-muted">dashboard</span>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Today's P/L", value: "+$482.10", tone: "text-good" },
          { label: "Win rate", value: "61%", tone: "" },
          { label: "Profit factor", value: "2.14", tone: "" },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-white/8 bg-black/25 p-3">
            <p className="text-[10px] font-medium tracking-wide text-muted uppercase">
              {s.label}
            </p>
            <p className={`mt-1 text-lg font-semibold tabular-nums ${s.tone}`}>
              {s.value}
            </p>
          </div>
        ))}
      </div>
      <svg
        viewBox="0 0 640 180"
        className="mt-4 w-full rounded-xl border border-white/8 bg-black/25"
        role="img"
        aria-label="Sample equity curve trending upward"
      >
        <defs>
          <linearGradient id="mockFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3987e5" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#3987e5" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[45, 90, 135].map((y) => (
          <line key={y} x1="0" x2="640" y1={y} y2={y} stroke="#2c2c2a" strokeWidth="1" />
        ))}
        <path
          d="M0,150 L60,142 L110,148 L160,128 L210,132 L260,110 L310,118 L360,96 L410,102 L460,78 L510,84 L560,58 L640,40 L640,180 L0,180 Z"
          fill="url(#mockFill)"
        />
        <path
          d="M0,150 L60,142 L110,148 L160,128 L210,132 L260,110 L310,118 L360,96 L410,102 L460,78 L510,84 L560,58 L640,40"
          fill="none"
          stroke="#3987e5"
          strokeWidth="2.5"
          strokeLinejoin="round"
        />
      </svg>
      <div className="mt-4 grid grid-cols-14 gap-1" aria-hidden>
        {[3, -1, 2, 4, 0, 1, -2, 3, 5, 1, -1, 2, 4, 6].map((v, i) => (
          <span
            key={i}
            className="h-7 rounded-md"
            style={{
              backgroundColor:
                v === 0
                  ? "rgba(255,255,255,0.04)"
                  : v > 0
                    ? `rgba(57,135,229,${0.18 + v * 0.1})`
                    : `rgba(230,103,103,${0.25 + Math.abs(v) * 0.12})`,
            }}
          />
        ))}
      </div>
    </div>
  );
}

function AnalyticsMock() {
  const bars = [-14, -8, 10, 22, 34, 48, 30, 18, -6, 26, 40, 12];
  return (
    <div className="glass-strong rounded-2xl p-5 shadow-2xl">
      <p className="text-xs font-medium text-muted uppercase">P/L by hour</p>
      <div className="mt-3 flex h-36 items-end gap-1.5" aria-hidden>
        {bars.map((v, i) => (
          <span
            key={i}
            className="flex-1 rounded-t-md"
            style={{
              height: `${Math.abs(v) * 2 + 12}%`,
              backgroundColor: v >= 0 ? "#3987e5" : "#e66767",
              borderRadius: v >= 0 ? "6px 6px 0 0" : "0 0 6px 6px",
              alignSelf: v >= 0 ? "flex-end" : "flex-start",
              opacity: 0.9,
            }}
          />
        ))}
      </div>
      <div className="mt-5 rounded-xl border border-[#fab219]/30 bg-[#fab219]/8 p-3.5">
        <p className="text-xs font-semibold tracking-wide text-[#fab219] uppercase">
          ⚠ Warning
        </p>
        <p className="mt-1 text-sm font-medium">Friday is your leak</p>
        <p className="mt-0.5 text-xs leading-relaxed text-ink-2">
          23 trades on Fridays netted −$612 (31% win rate). Consider sitting
          Fridays out for a month and compare.
        </p>
      </div>
      <div className="mt-3 rounded-xl border border-good/30 bg-good/8 p-3.5">
        <p className="text-xs font-semibold tracking-wide text-good uppercase">
          ✓ Working
        </p>
        <p className="mt-1 text-sm font-medium">Your edge lives on XAUUSD</p>
        <p className="mt-0.5 text-xs leading-relaxed text-ink-2">
          +$1,284 over 41 trades (63% win rate, avg 1.4R). Lean into it.
        </p>
      </div>
    </div>
  );
}
