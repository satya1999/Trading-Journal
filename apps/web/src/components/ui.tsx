"use client";

import clsx from "clsx";
import { Check, Copy, X } from "lucide-react";
import { useState } from "react";

export function Card({
  className,
  children,
  interactive,
}: {
  className?: string;
  children: React.ReactNode;
  interactive?: boolean;
}) {
  return (
    <div
      className={clsx(
        "glass rounded-2xl p-4",
        interactive && "glass-hover",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function Button({
  variant = "primary",
  size = "md",
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "ghost" | "danger" | "subtle";
  size?: "sm" | "md";
}) {
  return (
    <button
      className={clsx(
        "inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg font-medium transition-all disabled:cursor-not-allowed disabled:opacity-50",
        size === "md" ? "px-4 py-2 text-sm" : "px-2.5 py-1.5 text-xs",
        variant === "primary" &&
          "bg-accent text-white shadow-[0_1px_8px_-2px] shadow-accent/50 hover:bg-accent-deep",
        variant === "ghost" &&
          "border text-ink-2 hover:border-baseline hover:bg-surface-2 hover:text-ink",
        variant === "subtle" && "bg-surface-2 text-ink-2 hover:text-ink",
        variant === "danger" && "border border-bad/40 text-bad hover:bg-bad/10",
        className,
      )}
      {...props}
    />
  );
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={clsx(
        "w-full rounded-lg border bg-white/5 px-3 py-2 text-sm text-ink backdrop-blur-sm transition-colors placeholder:text-muted hover:border-baseline focus:border-accent focus:outline-none",
        props.className,
      )}
    />
  );
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={clsx(
        "cursor-pointer rounded-lg border bg-white/5 px-3 py-2 text-sm text-ink backdrop-blur-sm transition-colors *:bg-surface hover:border-baseline focus:border-accent focus:outline-none",
        props.className,
      )}
    />
  );
}

export function Badge({
  tone = "neutral",
  className,
  children,
}: {
  tone?: "neutral" | "good" | "bad" | "accent";
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium",
        tone === "neutral" && "bg-surface-2 text-ink-2",
        tone === "good" && "border-good/30 bg-good/10 text-good",
        tone === "bad" && "border-bad/30 bg-bad/10 text-bad",
        tone === "accent" && "border-accent/30 bg-accent/10 text-accent",
        className,
      )}
    >
      {children}
    </span>
  );
}

export function DirectionBadge({ direction }: { direction: "buy" | "sell" }) {
  return (
    <span
      className={clsx(
        "inline-flex w-14 items-center justify-center rounded-md py-0.5 text-[11px] font-semibold tracking-wide",
        direction === "buy"
          ? "bg-accent/15 text-accent"
          : "bg-bad/15 text-[#e66767]",
      )}
    >
      {direction === "buy" ? "LONG" : "SHORT"}
    </span>
  );
}

export function Spinner({ className }: { className?: string }) {
  return (
    <div
      className={clsx(
        "size-5 animate-spin rounded-full border-2 border-grid border-t-accent",
        className,
      )}
      role="status"
      aria-label="Loading"
    />
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={clsx("skeleton", className)} aria-hidden />;
}

export function Dialog({
  open,
  onClose,
  title,
  subtitle,
  wide,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  wide?: boolean;
  children: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={clsx(
          "glass-strong anim-fade-up max-h-[88vh] w-full overflow-y-auto rounded-2xl p-6",
          wide ? "max-w-2xl" : "max-w-lg",
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">{title}</h2>
            {subtitle && <p className="mt-0.5 text-sm text-ink-2">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            className="cursor-pointer rounded-md p-1 text-muted transition-colors hover:bg-surface-2 hover:text-ink"
            aria-label="Close"
          >
            <X className="size-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

/** Monospace value with a one-click copy button — used for tokens and URLs. */
export function CopyField({
  value,
  label,
  masked,
}: {
  value: string;
  label?: string;
  masked?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  return (
    <div>
      {label && (
        <p className="mb-1 text-xs font-medium text-muted uppercase">{label}</p>
      )}
      <div className="flex items-center gap-1.5 rounded-lg border bg-black/30 py-1.5 pr-1.5 pl-3 backdrop-blur-sm">
        <code className="min-w-0 flex-1 truncate font-mono text-sm text-ink">
          {masked ? value.slice(0, 10) + "•".repeat(12) : value}
        </code>
        <button
          type="button"
          onClick={async () => {
            await navigator.clipboard.writeText(value);
            setCopied(true);
            setTimeout(() => setCopied(false), 1600);
          }}
          className={clsx(
            "flex cursor-pointer items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors",
            copied
              ? "bg-good/15 text-good"
              : "bg-surface-2 text-ink-2 hover:text-ink",
          )}
        >
          {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
    </div>
  );
}
