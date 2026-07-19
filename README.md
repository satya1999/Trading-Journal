# TradeMind AI

AI-powered trading journal SaaS. Auto-syncs trades from MetaTrader 5 via an Expert Advisor, journals every trade, and surfaces performance analytics. See [PRD.md](PRD.md) for the full product spec.

**Milestone 1 (this codebase):** auth → MT5 EA auto-sync → trade journal → dashboard → basic analytics.
Milestone 2: AI trade analysis (Anthropic Claude), psychology journal, reports. Milestone 3: premium features + billing.

## Layout

| Path | What it is |
|---|---|
| `apps/web` | Next.js 15 dashboard (Tailwind, TanStack Query, ECharts) |
| `apps/api` | NestJS API (Prisma + PostgreSQL, Better Auth) |
| `packages/shared` | zod schemas + types shared by web/api/simulator |
| `ea/TradeMindSync.mq5` | MQL5 Expert Advisor — pushes deals/heartbeats to the API |
| `tools/ea-simulator` | Replays realistic EA traffic against the API (no MT5 needed) |
| `tools/dev-db` | Embedded PostgreSQL for machines without Docker |

## Getting started

```sh
pnpm install
copy .env.example .env          # then edit BETTER_AUTH_SECRET

# Database — pick one:
docker compose up -d postgres   # if you have Docker (port 5432)
pnpm db:up                      # embedded Postgres, no Docker (port 5433) — keep it running

pnpm db:migrate                 # apply Prisma migrations
pnpm dev                        # api on :4000, web on :3000
```

Register at http://localhost:3000, add a trading account, then either:

- **Real MT5**: the connect wizard hands you a **pre-configured `TradeMindSync.mq5`** (API URL + sync token already baked into the input defaults). Drop it in `MQL5\Experts`, refresh the Navigator (MT5 compiles it), whitelist the API URL under *Tools → Options → Expert Advisors → Allow WebRequest for listed URL*, and drag it onto any chart.
- **No MT5**: `pnpm simulate -- --token <sync-token>` replays a realistic trade history.

## Tests

```sh
pnpm --filter @trademind/api test   # ingestion aggregation, pip/RR math, idempotency units
```

## Architecture notes

- The EA **pushes JSON over HTTPS** (`/sync/handshake`, `/sync/deals`, `/sync/heartbeat`) authenticated by a per-account bearer token (stored hashed). MQL5 `WebRequest` has no practical WebSocket support, so push + 15s timer fallback is the design.
- Deals are aggregated into trades by MT5 `POSITION_IDENTIFIER` (handles partial closes, netting and hedging accounts). Ingestion is idempotent — same batch twice changes nothing.
- Ingestion runs inline in Milestone 1 (batches are small). BullMQ + Redis is the scale path once AI jobs land in Milestone 2; `docker-compose.yml` already provisions Redis.
