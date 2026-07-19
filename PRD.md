# Product Requirements Document (PRD)

# TradeMind AI – AI-Powered Trading Journal SaaS

**Version:** 1.0
**Product Type:** SaaS (Web + Mobile)
**Target Users:** Forex, CFD, Crypto, Futures, Stock Traders using MetaTrader 5 (later MT4, cTrader, TradingView)
**Vision:** Build the world's smartest AI-powered trading journal that automatically syncs trades from brokers, analyzes trader behavior, and acts as a personal trading coach.

---

# 1. Executive Summary

## Problem

Most traders fail because they:

* Don't journal consistently.
* Cannot identify recurring mistakes.
* Lack performance analytics.
* Have no psychology tracking.
* Review trades manually.
* Don't understand why they lose money.

Current solutions require manual trade uploads or lack intelligent insights.

## Solution

TradeMind AI automatically connects to MetaTrader 5 accounts using an EA (Expert Advisor), syncs every trade in real time, analyzes trading performance, tracks trader psychology, and provides AI-generated coaching to improve consistency and profitability.

---

# 2. Goals

### Business Goals

* Subscription-based SaaS
* High user retention through AI insights
* Support multiple brokers
* Become the "GitHub of Trading Journals"
* Build community and social sharing

### User Goals

* Zero manual journal entry
* Automatic trade sync
* Improve win rate
* Reduce emotional trading
* Understand mistakes
* Track progress over time

---

# 3. Target Audience

* **Retail Forex Traders** — MT5 users, gold traders, scalpers, swing traders
* **Prop Firm Traders** — FTMO, FundedNext, FundingPips, 5ers
* **Crypto Traders** — Binance, Bybit, OKX
* **Professional Traders** — portfolio managers, trading mentors, signal providers

---

# 4. Core Value Proposition

**Trade Once. Learn Forever.**

Automatically sync every trade, analyze your habits, detect mistakes, and receive AI coaching that helps you become a disciplined trader.

---

# 5. User Personas

* **Beginner** — learn from mistakes, simple analytics, AI explanations
* **Intermediate** — strategy tracking, performance reports, psychology journal
* **Professional** — portfolio analytics, multiple accounts, advanced metrics, export reports

---

# 6. MVP Features

## Authentication

Email, Google, Apple, Two-Factor Authentication, Password Reset

## Dashboard

Widgets: Today's P/L, Win Rate, Balance, Equity, Drawdown, Open Trades, Closed Trades, Profit Factor, AI Score, Daily Journal

## MT5 Integration

Using Expert Advisor. Auto sync: trades, orders, positions, balance, equity, margin, account info. Supports unlimited MT5 accounts and multiple brokers.

## Trade Journal

Every trade contains:

* **Trade details** — ticket, account, broker, symbol, buy/sell, entry, exit, stop loss, take profit, volume, commission, swap, slippage, net profit, RR, pip gain, duration
* **Custom fields** — strategy, setup, tags, notes

## AI Trade Analysis

Every closed trade generates a Trade Score, Execution Score, Risk Score, and Psychology Score.

Example: "Good patience. Entry respected your strategy. Exit was emotional. Risk exceeded your rules. Avoid trading after consecutive losses."

## Performance Analytics

Charts: equity curve, balance curve, drawdown curve, win rate, RR distribution, profit heatmap, calendar, strategy performance, symbol performance.

## Trading Calendar

Green = winning day, red = losing day. Click any day to view every trade.

## Psychology Journal

Mood, stress, confidence, sleep, emotion, mistakes, screenshots, voice notes.

## Reports

Daily, weekly, monthly, yearly. Export to PDF, Excel, CSV.

---

# 7. Premium Features

* **AI Coach** — daily/weekly/monthly reviews and suggestions (e.g. "Your average RR is only 0.8", "Your Friday performance is consistently poor", "Avoid London Close")
* **Strategy Analyzer** — compare strategies on win rate, average RR, drawdown, profit, expectancy
* **Session Analytics** — Asian, London, New York, overlap; find the best session
* **Symbol Analytics** — Gold, EURUSD, GBPJPY, NAS100, BTCUSD; find best symbols
* **Replay System** — replay every trade: price movement, indicators, entry, exit, mistakes
* **AI Psychology Detection** — FOMO, revenge trading, overtrading, fear, greed, early exit, late entry, moving stop loss, holding losers
* **Screenshot Journal** — automatic before entry / during trade / after exit, stored in cloud
* **Voice Notes** — record voice after every trade; AI summarizes
* **Goals** — monthly target, maximum drawdown, risk limit, daily/weekly/profit goals
* **Notifications** — Telegram, email, push; alerts for risk exceeded, daily loss, margin low, overtrading

---

# 8. Future Features

Broker API integration (TradingView, MT4, cTrader, NinjaTrader, Binance, Bybit), copy trading analytics, economic calendar, news filter, portfolio tracking, tax reports, community, leaderboards, mentorship, marketplace, public strategies, AI chatbot.

---

# 9. User Flow

```
Register → Verify Email → Create Workspace → Download MT5 EA → Install EA
→ Login EA → Connect Account → Trade Normally → Trades Auto Sync → AI Analysis
→ Journal → Performance Dashboard → Weekly Report → Improve Trading
```

---

# 10. System Architecture

```
MT5 Terminal
      │
Expert Advisor
      │
HTTPS/WebSocket
      │
API Gateway
      │
Authentication
      │
Trade Sync Service
      │
────────────────────────────
Trade Database
Market Database
Screenshot Storage
Analytics Engine
Notification Service
AI Service
Subscription Service
Admin Panel
────────────────────────────
      │
React Dashboard
Flutter App
```

---

# 11. Database Design (High Level)

* **Users** — id, name, email, password, plan
* **Trading Accounts** — id, user_id, broker, account_number, server, balance
* **Trades** — id, account_id, ticket, symbol, entry, exit, lot, pnl, rr, duration, commission, swap
* **Trade Notes** — trade_id, note, emotion, strategy, screenshot
* **AI Analysis** — trade_id, execution_score, psychology_score, ai_summary
* **Reports** — daily, weekly, monthly

---

# 12. SaaS Pricing

* **Free** — one MT5 account, 200 trades, basic analytics
* **Pro** — unlimited accounts, AI analysis, psychology journal, reports, calendar, replay, voice notes
* **Team** — multiple traders, admin dashboard, shared analytics, trade reviews, performance comparison

---

# 13. Tech Stack

* **Frontend** — Next.js, React, TypeScript, Tailwind CSS, shadcn/ui, TanStack Query
* **Backend** — NestJS, PostgreSQL, Redis, WebSockets, BullMQ
* **AI** — LLM API, vector database for personalized coaching context
* **Storage** — Amazon S3 / Cloudflare R2, PostgreSQL, Redis
* **Charts** — TradingView Lightweight Charts, Apache ECharts, Recharts
* **Authentication** — JWT/session, OAuth (Google, Apple), 2FA (TOTP)
* **Infrastructure** — Docker, Kubernetes (optional), NGINX, Cloudflare, GitHub Actions, Prometheus + Grafana

---

# 14. Success Metrics (KPIs)

* **Product** — DAU, MAU, trade sync success rate (>99.9%), average sync latency (<2s), crash-free sessions (>99.5%)
* **Business** — free-to-pro conversion, MRR, LTV, churn, NRR
* **User success** — journaling completion rate, weekly trade reviews, AI recommendation adoption, reduction in rule violations, increase in risk-adjusted returns

---

# 15. Long-Term Vision

TradeMind AI should evolve from a simple trading journal into a comprehensive **AI Trading Performance Operating System**. Beyond recording trades, it will unify broker connectivity, behavioral psychology, quantitative analytics, and personalized AI coaching into a single platform. Future capabilities include live risk monitoring, strategy backtesting, market replay, collaborative coaching, prop-firm performance management, and predictive insights that help traders make better decisions before, during, and after every trade. The long-term objective is to become the central workspace where traders track performance, refine strategies, and continuously improve through data-driven feedback and intelligent automation.
