export const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

/** The URL baked into the EA. MT5's WebRequest frequently fails to resolve
 *  "localhost", so a local server address is rewritten to 127.0.0.1. */
export const EA_API_URL = API_URL.replace("//localhost", "//127.0.0.1");

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(API_URL + path, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...init?.headers },
    ...init,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new ApiError(res.status, text || res.statusText);
  }
  return (await res.json()) as T;
}

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
