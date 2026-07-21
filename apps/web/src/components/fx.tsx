"use client";

import clsx from "clsx";
import type { LucideIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";

/** Fades/slides children in when they scroll into view. */
export function Reveal({
  children,
  delay = 0,
  className,
  as: Tag = "div",
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
  as?: "div" | "section" | "li" | "span";
}) {
  const ref = useRef<HTMLElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) {
      setVisible(true);
      return;
    }

    // If IntersectionObserver is unavailable, don't hide content behind it.
    if (typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }

    // Anything already within (or above) the viewport on mount reveals now —
    // covers above-the-fold content without waiting on an observer callback,
    // and sidesteps threshold quirks for elements taller than the viewport.
    const rect = el.getBoundingClientRect();
    if (rect.top < window.innerHeight && rect.bottom > 0) {
      setVisible(true);
      return;
    }

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          io.disconnect();
        }
      },
      { threshold: 0, rootMargin: "0px 0px -10% 0px" },
    );
    io.observe(el);

    // Safety net: never let content stay invisible if the observer misfires.
    const failsafe = window.setTimeout(() => setVisible(true), 1200);

    return () => {
      io.disconnect();
      window.clearTimeout(failsafe);
    };
  }, []);

  return (
    <Tag
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ref={ref as any}
      className={clsx("reveal", visible && "is-visible", className)}
      style={{ "--reveal-delay": `${delay}ms` } as React.CSSProperties}
    >
      {children}
    </Tag>
  );
}

/** Pointer-tracking 3D tilt. Wrap a card to make it feel physical. */
export function Tilt({
  children,
  max = 8,
  className,
}: {
  children: React.ReactNode;
  max?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  function onMove(e: React.PointerEvent) {
    const el = ref.current;
    if (!el || e.pointerType !== "mouse") return;
    const rect = el.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width - 0.5;
    const py = (e.clientY - rect.top) / rect.height - 0.5;
    el.style.transform = `rotateY(${px * max}deg) rotateX(${-py * max}deg)`;
  }
  function onLeave() {
    if (ref.current) ref.current.style.transform = "";
  }

  return (
    <div className={clsx("tilt-wrap", className)}>
      <div ref={ref} className="tilt" onPointerMove={onMove} onPointerLeave={onLeave}>
        {children}
      </div>
    </div>
  );
}

const ICON_HUES: Record<string, { a: string; b: string; glow: string }> = {
  blue: { a: "#5598e7", b: "#1c5cab", glow: "rgba(57,135,229,0.45)" },
  violet: { a: "#9085e9", b: "#4a3aa7", glow: "rgba(144,133,233,0.45)" },
  green: { a: "#1baf7a", b: "#0e6b4a", glow: "rgba(27,175,122,0.4)" },
  orange: { a: "#eb6834", b: "#a03e17", glow: "rgba(235,104,52,0.4)" },
  magenta: { a: "#e87ba4", b: "#a63c66", glow: "rgba(232,123,164,0.4)" },
  yellow: { a: "#eda100", b: "#8f6100", glow: "rgba(237,161,0,0.4)" },
};

/** A glossy pseudo-3D icon tile (pure CSS — no external assets). */
export function Icon3D({
  icon: Icon,
  hue = "blue",
}: {
  icon: LucideIcon;
  hue?: keyof typeof ICON_HUES;
}) {
  const h = ICON_HUES[hue] ?? ICON_HUES.blue;
  return (
    <span
      className="icon3d"
      style={
        {
          "--i3d-a": h.a,
          "--i3d-b": h.b,
          "--i3d-glow": h.glow,
        } as React.CSSProperties
      }
      aria-hidden
    >
      <Icon className="size-6" />
    </span>
  );
}
