# Crypto Signal

Next.js app that pulls **candlesticks** from the **Binance public API** at a **user-selectable interval** (minute and hour timeframes), computes technical indicators, applies **strategy rules** to derive **entry, take-profit, and stop-loss**, then optionally asks **Google Gemini** (`@google/genai`) for a short **confidence** and **reason** (without changing the mechanical levels).

This is a demo / research tool, **not financial advice**. Trading crypto carries risk of total loss.

## Prerequisites

- **Node.js** 18+ (LTS recommended) and **npm** on your `PATH`.
  - If `npm` is not recognized in PowerShell, add `C:\Program Files\nodejs` to your user **Path** (Environment Variables), then open a **new** terminal.
- A **Gemini API key** from [Google AI Studio](https://aistudio.google.com/apikey) if you want AI explanations.

## Setup

```bash
cd CryptoSignal
npm install
```

Create **`.env.local`** (or `.env`) in the project root:

```env
GEMINI_API_KEY=your_key_here
```

Optional:

```env
GEMINI_MODEL=gemini-2.0-flash
```

If `GEMINI_MODEL` is omitted, the app defaults to `gemini-2.0-flash`. You can set a preview model name here if your key supports it.

## Run

Development (with Turbopack):

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Production build and start:

```bash
npm run build
npm run start
```

Lint:

```bash
npm run lint
```

## How it works

1. **Data:** `GET https://api.binance.com/api/v3/klines?symbol={SYMBOL}&interval={INTERVAL}&limit=100` (spot public API). `INTERVAL` is any kline id exposed in the app (minute and hour timeframes; see `src/lib/intervals.ts`).
2. **Indicators:** EMA20 / EMA50, RSI(14), MACD(12,26,9), ATR(14), Bollinger(20, 2σ), 20-bar average volume.
3. **Strategies (mechanical):**
   - `hedging` — mean-reversion-style filters; ATR multipliers `k_tp=0.8`, `k_sl=1.5`.
   - `trend_following` — trend + MACD + pullback band; `k_tp=1.8`, `k_sl=1.0`.
   - `breakout` — close outside Bollinger + volume vs average; `k_tp=2.2`, `k_sl=0.8`.
   - `scalping` — high ATR% + RSI extreme + MACD histogram cross; `k_tp=0.4`, `k_sl=0.25`.
4. **Levels:** TP/SL use `entry = last close`, ATR14, and the strategy’s `k_tp` / `k_sl` with direction **BUY** or **SELL**. **HOLD** means filters did not align; TP/SL are not meaningful for that case.
5. **Gemini:** Receives the same numbers plus strategy math text; returns JSON with `confidence`, `reason`, optional `leverage` note. If the key is missing, the UI still shows the mechanical result.

**UI:** Dark dashboard (navy cards, neon accents). **Pair** is a text field (any Binance spot symbol) with quick suggestions via a datalist. **Chart interval** is a dropdown (minutes and hours). The chart uses [lightweight-charts](https://www.tradingview.com/lightweight-charts/) with candles, EMA20/EMA50, Bollinger bands, volume histogram, and **TP / SL / last close** price lines when applicable.

**Market type:** `spot` vs `futures` in the UI mainly affects **leverage wording**; prices still come from **spot** klines unless you extend the code to call futures endpoints.

## API

**`POST /api/signal`**

Body (JSON):

| Field | Required | Description |
|--------|-----------|-------------|
| `symbol` | No | Default `BTCUSDT`. Binance spot pair, e.g. `ETHUSDT`. |
| `strategy` | Yes | `hedging` \| `trend_following` \| `breakout` \| `scalping` |
| `marketType` | No | `spot` (default) or `futures` |
| `interval` | No | Kline interval id (see `CHART_INTERVAL_OPTIONS` in `src/lib/intervals.ts`). If omitted, the server uses `DEFAULT_CHART_INTERVAL` (currently `1h`). Invalid values return `400`. |

Example:

```bash
curl -s -X POST http://localhost:3000/api/signal ^
  -H "Content-Type: application/json" ^
  -d "{\"symbol\":\"BTCUSDT\",\"strategy\":\"trend_following\",\"marketType\":\"spot\",\"interval\":\"15m\"}"
```

(On Unix shells, use `\` line continuation and single-quote the JSON if preferred.)

Response: JSON with `success`, `mechanical` (signal, entry, tp, sl, checks), `indicators`, and optional `ai` (`confidence`, `reason`).

`useAi: false` in the body skips the Gemini call.

## Project layout

| Path | Role |
|------|------|
| `src/lib/intervals.ts` | Allowed intervals + `DEFAULT_CHART_INTERVAL` |
| `src/lib/binance.ts` | Fetch klines for a given interval |
| `src/lib/indicators.ts` | Indicator math |
| `src/lib/snapshot.ts` | Last-bar snapshot |
| `src/lib/strategy.ts` | Strategy evaluation + TP/SL |
| `src/lib/gemini.ts` | Gemini prompt + parse |
| `src/lib/chartSeries.ts` | OHLCV + EMA/BB series for chart |
| `src/app/api/signal/route.ts` | HTTP API (+ `chart` payload) |
| `src/components/CandlestickChart.tsx` | Candlestick chart (interval label in header) |
| `src/content/uiCopy.ts` | User-facing welcome, strategy blurbs, indicators guide, disclaimers |
| `src/app/page.tsx` | Dashboard UI |

## License

Private / use at your own risk.
