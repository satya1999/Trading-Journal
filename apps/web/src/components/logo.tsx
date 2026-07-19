import clsx from "clsx";

export function Logo({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <span
        className={clsx(
          "grid place-items-center rounded-lg bg-gradient-to-br from-accent to-accent-deep font-bold text-white",
          size === "sm" && "size-6 text-xs",
          size === "md" && "size-8 text-sm",
          size === "lg" && "size-10 text-lg",
        )}
        aria-hidden
      >
        T
      </span>
      <span
        className={clsx(
          "font-semibold tracking-tight",
          size === "sm" && "text-sm",
          size === "md" && "text-base",
          size === "lg" && "text-xl",
        )}
      >
        TradeMind{" "}
        <span className="bg-gradient-to-r from-accent to-[#7db4f0] bg-clip-text text-transparent">
          AI
        </span>
      </span>
    </span>
  );
}
