export const CONVEX_URL =
  process.env.NEXT_PUBLIC_CONVEX_URL ?? "https://careful-duck-681.convex.cloud";

export const EA_API_URL =
  process.env.NEXT_PUBLIC_CONVEX_SITE_URL ?? "https://careful-duck-681.convex.site";

export const fmtMoney = (n: number | null | undefined, currency = "USD") =>
  n == null
    ? "—"
    : new Intl.NumberFormat("en-US", {
        style: "currency",
        currency,
        maximumFractionDigits: 2,
      }).format(n);

export const fmtSigned = (n: number | null | undefined, currency = "USD") =>
  n == null ? "—" : (n > 0 ? "+" : "") + fmtMoney(n, currency);

export const fmtNum = (n: number | null | undefined, digits = 2) =>
  n == null || !isFinite(n) ? "—" : n.toFixed(digits);

export const fmtDuration = (sec: number | null | undefined) => {
  if (sec == null) return "—";
  if (sec < 60) return `${sec}s`;
  if (sec < 3600) return `${Math.round(sec / 60)}m`;
  if (sec < 86400) return `${(sec / 3600).toFixed(1)}h`;
  return `${(sec / 86400).toFixed(1)}d`;
};
