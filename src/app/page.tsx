"use client";

import {
  aiWriteup,
  footerAttribution,
  indicatorGuide,
  mechanicalHowItWorks,
  riskDisclaimer,
  strategyWriteups,
  welcomeIntro,
} from "@/content/uiCopy";
import {
  CHART_INTERVAL_OPTIONS,
  DEFAULT_CHART_INTERVAL,
  intervalCaption,
  type ChartInterval,
} from "@/lib/intervals";
import type { IndicatorSnapshot, MarketType, MechanicalSignal, SignalResponse, StrategyId } from "@/lib/types";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useState, type ChangeEvent } from "react";

const CandlestickChartDynamic = dynamic(
  () => import("@/components/CandlestickChart").then((m) => ({ default: m.CandlestickChart })),
  {
    ssr: false,
    loading: () => (
      <div
        className="hud-panel flex h-[420px] items-center justify-center text-sm text-[var(--text-muted)]"
        aria-hidden
      >
        <span className="font-data animate-pulse tracking-widest">Loading chart…</span>
      </div>
    ),
  },
);

const SYMBOL_OPTIONS = ["BTCUSDT", "ETHUSDT", "SOLUSDT", "BNBUSDT", "XRPUSDT", "DOGEUSDT"] as const;

const STRATEGY_OPTIONS: { id: StrategyId; label: string }[] = [
  { id: "hedging", label: "Hedging" },
  { id: "trend_following", label: "Trend Following" },
  { id: "breakout", label: "Breakout" },
  { id: "scalping", label: "Scalping" },
];

const INTERVAL_MINUTES = CHART_INTERVAL_OPTIONS.filter((o) => o.id.endsWith("m"));
const INTERVAL_HOURS = CHART_INTERVAL_OPTIONS.filter((o) => o.id.endsWith("h"));

function intervalShortLabel(id: ChartInterval): string {
  return CHART_INTERVAL_OPTIONS.find((o) => o.id === id)?.label ?? id;
}

export default function Home() {
  const [symbol, setSymbol] = useState("BTCUSDT");
  const [chartInterval, setChartInterval] = useState<ChartInterval>(DEFAULT_CHART_INTERVAL);
  const [strategy, setStrategy] = useState<StrategyId>("trend_following");
  const [marketType, setMarketType] = useState<MarketType>("spot");
  const [useAi, setUseAi] = useState(true);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SignalResponse | null>(null);
  const [clientError, setClientError] = useState<string | null>(null);
  /** Avoid header/interval control hydration mismatches when dev server and client bundles disagree on defaults. */
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    setHydrated(true);
  }, []);

  const run = useCallback(async () => {
    setLoading(true);
    setClientError(null);
    setResult(null);
    try {
      const res = await fetch("/api/signal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          symbol: symbol.trim().toUpperCase(),
          strategy,
          marketType,
          useAi,
          interval: chartInterval,
        }),
      });
      const data = (await res.json()) as SignalResponse & { error?: string };
      if (!res.ok || !data.success) {
        setClientError(data.error ?? res.statusText);
        return;
      }
      setResult(data);
    } catch (e) {
      setClientError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [symbol, strategy, marketType, useAi, chartInterval]);

  return (
    <div className="relative flex min-h-screen flex-col">
      <header className="hud-header sticky top-0 z-50">
        <div className="mx-auto flex max-w-[1600px] flex-col gap-4 px-4 py-4 md:flex-row md:flex-wrap md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div
              className="hud-logo-ring relative flex h-11 w-11 items-center justify-center rounded-lg font-display text-sm font-bold tracking-tighter text-[#0A0F29]"
              style={{
                background: "linear-gradient(140deg, var(--accent-2) 0%, var(--accent) 55%, #6366f1 100%)",
              }}
            >
              <span className="relative z-10">CS</span>
            </div>
            <div>
              <h1 className="font-display text-lg font-semibold tracking-wide text-[var(--text)]">
                Crypto Signal
              </h1>
              <p className="font-data text-[10px] tracking-widest text-[var(--text-muted)]">
                {hydrated ? `${intervalShortLabel(chartInterval)} · ` : ""}
                BINANCE · MECH + GEMINI
              </p>
            </div>
          </div>

          <div className="flex flex-1 flex-wrap items-center gap-3 md:justify-end">
            <label className="flex min-w-[160px] flex-col gap-1.5">
              <span className="hud-label">Pair</span>
              <input
                list="pair-suggestions"
                value={symbol}
                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                  setSymbol(e.target.value.replace(/\s/g, "").toUpperCase())
                }
                placeholder="e.g. BTCUSDT"
                autoComplete="off"
                className="hud-field w-full px-3 py-2 font-data text-sm text-[var(--text)] placeholder:text-[var(--text-muted)] outline-none"
              />
              <datalist id="pair-suggestions">
                {SYMBOL_OPTIONS.map((s) => (
                  <option key={s} value={s} />
                ))}
              </datalist>
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="hud-label">Strategy</span>
              <select
                value={strategy}
                onChange={(e: ChangeEvent<HTMLSelectElement>) =>
                  setStrategy(e.target.value as StrategyId)
                }
                className="hud-field min-w-[160px] px-3 py-2 text-sm text-[var(--text)] outline-none"
              >
                {STRATEGY_OPTIONS.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="hud-label">Chart interval</span>
              {hydrated ? (
                <select
                  value={chartInterval}
                  onChange={(e: ChangeEvent<HTMLSelectElement>) =>
                    setChartInterval(e.target.value as ChartInterval)
                  }
                  className="hud-field min-w-[140px] px-3 py-2 text-sm text-[var(--text)] outline-none"
                >
                  <optgroup label="Minutes">
                    {INTERVAL_MINUTES.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.label} ({o.caption})
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="Hours">
                    {INTERVAL_HOURS.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.label} ({o.caption})
                      </option>
                    ))}
                  </optgroup>
                </select>
              ) : (
                <div
                  className="hud-field flex min-h-[42px] min-w-[140px] items-center px-3 py-2 text-sm text-[var(--text-muted)]"
                  aria-hidden
                >
                  …
                </div>
              )}
            </label>

            <div className="flex flex-col gap-1.5">
              <span className="hud-label">Type</span>
              <div className="hud-field flex p-0.5">
                {(["spot", "futures"] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setMarketType(t)}
                    className={`rounded-md px-3 py-2 text-xs font-medium capitalize transition-all ${
                      marketType === t
                        ? "bg-gradient-to-r from-[var(--accent)] to-[#6366f1] text-white shadow-[0_0_16px_rgba(92,77,255,0.5)]"
                        : "text-[var(--text-muted)] hover:text-[var(--accent-2)]"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <label className="hud-field flex cursor-pointer items-center gap-2 px-3 py-2">
              <input
                type="checkbox"
                checked={useAi}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setUseAi(e.target.checked)}
                className="h-4 w-4 rounded border-[var(--border)] bg-[var(--bg)] text-[var(--accent)] focus:ring-[var(--accent-2)]"
              />
              <span className="text-xs font-medium text-[var(--text)]">Use AI explanation</span>
            </label>

            <button
              type="button"
              onClick={run}
              disabled={loading || !symbol.trim()}
              className="hud-cta px-5 py-2.5 font-display text-sm font-semibold tracking-wide text-white disabled:opacity-40"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Updating…
                </span>
              ) : (
                "Update signal"
              )}
            </button>
          </div>
        </div>
        {clientError && (
          <div className="border-t border-red-500/40 bg-red-950/30 px-4 py-2 font-data text-sm text-[var(--sell)] shadow-[0_0_24px_-8px_rgba(255,69,0,0.35)]">
            {clientError}
          </div>
        )}
      </header>

      <main className="flex-1 px-4 py-6">
        <div className="mx-auto max-w-[1600px] space-y-6">
          <section className="hud-panel p-6 md:p-8">
            <h2 className="font-display text-xl font-semibold tracking-wide text-[var(--text)] md:text-2xl">
              {welcomeIntro.title}
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-[var(--text-muted)] md:text-base">
              {welcomeIntro.lead}
            </p>
            <ul className="mt-4 grid gap-2 text-sm text-[var(--text)] sm:grid-cols-2">
              <li className="flex items-start gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--accent-2)]" />
                Entry price
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--accent-2)]" />
                Take-profit level
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--accent-2)]" />
                Stop-loss level
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--accent-2)]" />
                Buy / Sell / Hold
              </li>
              <li className="flex items-start gap-2 sm:col-span-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--accent)]" />
                Optional AI explanation (Gemini)
              </li>
            </ul>
            <p className="mt-4 text-sm leading-relaxed text-[var(--text-muted)]">{welcomeIntro.closing}</p>
          </section>

          <section className="hud-panel-soft p-5 md:p-6">
            <p className="hud-label [color:var(--accent)]">Selected strategy</p>
            <h3 className="font-display mt-2 text-lg font-semibold tracking-wide text-[var(--text)]">
              {strategyWriteups[strategy].title}
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-[var(--text-muted)]">
              {strategyWriteups[strategy].body}
            </p>
            <dl className="mt-4 grid gap-2 text-xs sm:grid-cols-3">
              <div>
                <dt className="text-[var(--text-muted)]">Best for</dt>
                <dd className="mt-0.5 text-[var(--text)]">{strategyWriteups[strategy].bestFor}</dd>
              </div>
              <div>
                <dt className="text-[var(--text-muted)]">Risk level</dt>
                <dd className="mt-0.5 text-[var(--text)]">{strategyWriteups[strategy].risk}</dd>
              </div>
              <div>
                <dt className="text-[var(--text-muted)]">Ideal for</dt>
                <dd className="mt-0.5 text-[var(--text)]">{strategyWriteups[strategy].idealFor}</dd>
              </div>
            </dl>
            <details className="mt-4 rounded-lg border border-[var(--accent-2)]/15 bg-black/30 p-3 text-sm backdrop-blur-sm">
              <summary className="cursor-pointer font-display text-xs font-medium tracking-wide text-[var(--accent-2)]">
                Compare all strategies
              </summary>
              <div className="mt-4 space-y-4 border-t border-white/5 pt-4">
                {(Object.keys(strategyWriteups) as StrategyId[]).map((id) => {
                  const s = strategyWriteups[id];
                  return (
                    <div key={id} className={id === strategy ? "opacity-100" : "opacity-90"}>
                      <p className="font-display text-sm font-semibold tracking-wide text-[var(--text)]">
                        {s.title}
                      </p>
                      <p className="mt-1 text-xs leading-relaxed text-[var(--text-muted)]">{s.body}</p>
                      <p className="mt-1 text-[10px] text-[var(--text-muted)]">
                        {s.bestFor} · Risk: {s.risk} · {s.idealFor}
                      </p>
                    </div>
                  );
                })}
              </div>
            </details>
          </section>

          <div className="grid gap-6 lg:grid-cols-2">
          <section className="space-y-6">
            {loading ? (
              <>
                <SkeletonCard />
                <SkeletonCard />
                <SkeletonChart />
              </>
            ) : result ? (
              <>
                <PriceCard ind={result.indicators} symbol={result.symbol} />
                <IndicatorsCard ind={result.indicators} />
                {result.chart ? (
                  <CandlestickChartDynamic
                    chart={result.chart}
                    mechanical={result.mechanical}
                    intervalLabel={intervalShortLabel(result.indicators.timeframe)}
                  />
                ) : null}
              </>
            ) : (
              <div className="hud-panel-soft rounded-xl border border-dashed border-[var(--accent-2)]/25 p-8 text-center text-sm text-[var(--text-muted)]">
                Set <strong className="text-[var(--text)]">pair</strong>,{" "}
                <strong className="text-[var(--text)]">strategy</strong>, and{" "}
                <strong className="text-[var(--text)]">Update signal</strong> to load price, indicators, and the
                {hydrated ? ` ${intervalShortLabel(chartInterval)}` : ""} chart.
              </div>
            )}
          </section>

          <section className="space-y-6">
            {loading ? (
              <>
                <SkeletonCard tall />
                <SkeletonCard tall />
              </>
            ) : result ? (
              <>
                <MechanicalCard m={result.mechanical} meta={result} />
                <AiCard
                  ai={result.ai}
                  marketType={result.marketType}
                  useAiRequested={useAi}
                  geminiModel={result.geminiModel}
                />
              </>
            ) : (
              <div className="hud-panel-soft rounded-xl border border-dashed border-[var(--accent)]/20 p-8 text-center text-sm text-[var(--text-muted)] lg:min-h-[200px] lg:flex lg:flex-col lg:justify-center">
                Mechanical signal and AI explanation appear here after you run{" "}
                <strong className="text-[var(--text)]">Update signal</strong>.
              </div>
            )}
          </section>
          </div>
        </div>
      </main>

      <footer className="mt-auto border-t border-[var(--accent-2)]/15 bg-[var(--card)]/80 px-4 py-6 text-center text-xs leading-relaxed text-[var(--text-muted)] backdrop-blur-md">
        <p className="text-[var(--text)]">{footerAttribution.data}</p>
        <p className="mt-2">{footerAttribution.ai}</p>
        <p className="mt-2">{footerAttribution.mechanical}</p>
        <p className="mx-auto mt-5 max-w-2xl border-t border-[var(--border)] pt-4 text-[11px]">{riskDisclaimer}</p>
        {result?.geminiModel && useAi && (
          <p className="font-data mt-3 text-[10px] text-[var(--accent-2)]">Model: {result.geminiModel}</p>
        )}
      </footer>
    </div>
  );
}

function SkeletonCard({ tall }: { tall?: boolean }) {
  return (
    <div
      className={`hud-panel relative overflow-hidden ${tall ? "min-h-[200px]" : "min-h-[140px]"}`}
    >
      <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/5 to-transparent" />
      <div className="p-6">
        <div className="h-4 w-1/3 rounded bg-white/10" />
        <div className="mt-4 h-8 w-2/3 rounded bg-white/10" />
        <div className="mt-3 h-3 w-full rounded bg-white/5" />
      </div>
    </div>
  );
}

function SkeletonChart() {
  return (
    <div className="hud-panel relative h-[420px] overflow-hidden bg-[#0A0F29]/80">
      <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/5 to-transparent" />
    </div>
  );
}

function PriceCard({ ind, symbol }: { ind: IndicatorSnapshot; symbol: string }) {
  const tf = intervalCaption(ind.timeframe);
  return (
    <div className="hud-panel p-6">
      <p className="hud-label [color:rgba(160,160,160,0.88)]">Current price · {symbol}</p>
      <p className="font-data mt-3 text-4xl font-semibold tracking-tight text-[var(--text)] [text-shadow:0_0_40px_rgba(0,207,253,0.15)]">
        {fmt(ind.C)}
      </p>
      <div className="mt-4 grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
        <Ohlc label="Open" v={ind.O} />
        <Ohlc label="High" v={ind.H} up />
        <Ohlc label="Low" v={ind.L} down />
        <Ohlc label="Close" v={ind.C} />
      </div>
      <p className="mt-3 text-[10px] text-[var(--text-muted)]">Last {tf} candle</p>
    </div>
  );
}

function Ohlc({ label, v, up, down }: { label: string; v: number; up?: boolean; down?: boolean }) {
  const c =
    up === true ? "text-[var(--buy)]" : down === true ? "text-[var(--sell)]" : "text-[var(--text-muted)]";
  return (
    <div>
      <p className={c}>{label}</p>
      <p className="font-data text-sm text-[var(--text)]">{fmt(v)}</p>
    </div>
  );
}

function IndicatorsCard({ ind }: { ind: IndicatorSnapshot }) {
  const rsi = Math.max(0, Math.min(100, ind.rsi14));

  return (
    <div className="hud-panel p-6">
      <h2 className="font-display text-sm font-semibold tracking-wide text-[var(--text)]">Indicators</h2>
      <div className="mt-4 space-y-5">
        <div>
          <div className="flex justify-between text-xs text-[var(--text-muted)]">
            <span>EMA20</span>
            <span className="font-data text-[var(--accent-2)]">{fmt(ind.ema20)}</span>
          </div>
          <div className="mt-2 flex justify-between text-xs text-[var(--text-muted)]">
            <span>EMA50</span>
            <span className="font-data text-[var(--accent)]">{fmt(ind.ema50)}</span>
          </div>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-black/40">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[var(--accent)] to-[var(--accent-2)]"
              style={{
                width: `${
                  (Math.abs(ind.ema20 - ind.ema50) / (ind.C * 0.02 + 1e-9)) * 50 > 100
                    ? 100
                    : (Math.abs(ind.ema20 - ind.ema50) / (ind.C * 0.02 + 1e-9)) * 50
                }%`,
              }}
            />
          </div>
        </div>

        <div>
          <div className="flex justify-between text-xs text-[var(--text-muted)]">
            <span>RSI14</span>
            <span className="font-data text-[var(--text)]">{ind.rsi14.toFixed(2)}</span>
          </div>
          <div className="relative mt-2 h-3 w-full overflow-hidden rounded-full bg-black/40">
            <div
              className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-[var(--sell)] via-[var(--accent-2)] to-[var(--buy)]"
              style={{ width: `${rsi}%` }}
            />
            <div
              className="absolute top-0 h-full w-0.5 bg-white/90 shadow-[0_0_6px_white]"
              style={{ left: `${rsi}%`, transform: "translateX(-50%)" }}
            />
          </div>
          <p className="mt-1 text-[10px] text-[var(--text-muted)]">0 — 100 scale</p>
        </div>

        <div>
          <div className="flex justify-between text-xs text-[var(--text-muted)]">
            <span>MACD hist · signal · line</span>
            <span className="font-data text-[var(--text)]">
              {ind.macdHist.toFixed(4)} · {ind.macdSignal.toFixed(4)} · {ind.macdLine.toFixed(4)}
            </span>
          </div>
          <div className="relative mt-2 h-2 w-full overflow-hidden rounded-full bg-black/40">
            <div className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-[var(--text-muted)]/60" />
            <div
              className={`absolute top-0 h-full ${ind.macdHist >= 0 ? "left-1/2 rounded-r-full bg-[var(--buy)]/75" : "right-1/2 rounded-l-full bg-[var(--sell)]/75"}`}
              style={{
                width: `${Math.min(50, 8 + Math.min(Math.log1p(Math.abs(ind.macdHist)) * 12, 42))}%`,
              }}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 text-xs">
          <div>
            <p className="text-[var(--text-muted)]">ATR14</p>
            <p className="font-data text-[var(--text)]">{fmt(ind.atr14)}</p>
          </div>
          <div>
            <p className="text-[var(--text-muted)]">Avg vol (20)</p>
            <p className="font-data text-[var(--text)]">{fmt(ind.avgVolume20)}</p>
          </div>
          <div>
            <p className="text-[var(--text-muted)]">BB upper</p>
            <p className="font-data text-[var(--buy)]">{fmt(ind.bbUp)}</p>
          </div>
          <div>
            <p className="text-[var(--text-muted)]">BB lower</p>
            <p className="font-data text-[var(--sell)]">{fmt(ind.bbLow)}</p>
          </div>
          <div className="col-span-2">
            <p className="text-[var(--text-muted)]">BB middle</p>
            <p className="font-data text-[var(--text)]">{fmt(ind.bbMid)}</p>
          </div>
        </div>
      </div>

      <details className="mt-6 rounded-lg border border-[var(--accent-2)]/12 bg-black/25 p-4 text-sm backdrop-blur-sm">
        <summary className="cursor-pointer font-display text-xs font-medium tracking-wide text-[var(--accent-2)]">
          What these indicators mean
        </summary>
        <ul className="mt-4 space-y-3 border-t border-white/5 pt-4 text-xs leading-relaxed">
          {indicatorGuide.map((row) => (
            <li key={row.name}>
              <span className="font-semibold text-[var(--text)]">{row.name}</span>
              <span className="text-[var(--text-muted)]"> — {row.text}</span>
            </li>
          ))}
        </ul>
      </details>
    </div>
  );
}

function MechanicalCard({ m, meta }: { m: MechanicalSignal; meta: SignalResponse }) {
  const isBuy = m.signal === "BUY";
  const isSell = m.signal === "SELL";
  const badgeColor = isBuy ? "var(--buy)" : isSell ? "var(--sell)" : "var(--hold)";
  const checksNote = typeof m.checks.note === "string" ? m.checks.note : null;
  const checkEntries = Object.entries(m.checks).filter(([k]) => k !== "note");

  return (
    <div className="hud-panel p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-sm font-semibold tracking-wide text-[var(--text)]">
            Mechanical signal
          </h2>
          <p className="font-data text-[10px] uppercase tracking-widest text-[var(--text-muted)]">
            {meta.symbol} · {intervalShortLabel(meta.indicators.timeframe)} ·{" "}
            {meta.strategy.replaceAll("_", " ")}
          </p>
        </div>
        <span
          className="rounded-full px-4 py-1.5 text-xs font-bold uppercase tracking-wide text-[#0A0F29]"
          style={{ background: badgeColor, boxShadow: `0 0 16px ${badgeColor}66` }}
        >
          {m.signal}
        </span>
      </div>

      <dl className="mt-6 grid gap-4 sm:grid-cols-3">
        <div>
          <dt className="hud-label text-[10px] normal-case tracking-normal [color:rgba(160,160,160,0.9)]">
            Entry (last close)
          </dt>
          <dd className="font-data text-xl text-[var(--text)]">{fmt(m.entry)}</dd>
        </div>
        <div>
          <dt className="hud-label text-[10px] normal-case tracking-normal [color:rgba(160,160,160,0.9)]">
            Take profit
          </dt>
          <dd className="font-data text-xl text-[var(--buy)]">{m.signal === "HOLD" ? "—" : fmt(m.tp)}</dd>
        </div>
        <div>
          <dt className="hud-label text-[10px] normal-case tracking-normal [color:rgba(160,160,160,0.9)]">
            Stop loss
          </dt>
          <dd className="font-data text-xl text-[var(--sell)]">{m.signal === "HOLD" ? "—" : fmt(m.sl)}</dd>
        </div>
      </dl>

      <p className="mt-4 text-xs text-[var(--text-muted)]">
        k_tp={m.kTp}, k_sl={m.kSl} · {m.leverageHint}
      </p>

      <div className="mt-4 rounded-lg border border-[var(--accent-2)]/10 bg-black/25 p-4 backdrop-blur-sm">
        <p className="hud-label [color:rgba(160,160,160,0.85)]">Checks / notes</p>
        {checksNote ? (
          <p className="mt-2 text-sm leading-relaxed text-[var(--text)]">{checksNote}</p>
        ) : (
          <ul className="mt-2 list-inside list-disc space-y-1 text-xs text-[var(--text-muted)]">
            {checkEntries.slice(0, 8).map(([k, v]) => (
              <li key={k}>
                <span className="text-[var(--text-muted)]">{k}:</span>{" "}
                <span className="text-[var(--text)]">{String(v)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <details className="mt-4 rounded-lg border border-[var(--accent-2)]/12 bg-black/25 p-4 text-sm backdrop-blur-sm">
        <summary className="cursor-pointer font-display text-xs font-medium tracking-wide text-[var(--accent-2)]">
          {mechanicalHowItWorks.title}
        </summary>
        <div className="mt-4 space-y-4 border-t border-white/5 pt-4 text-xs leading-relaxed text-[var(--text-muted)]">
          {mechanicalHowItWorks.blocks.map((b) => (
            <div key={b.heading}>
              <p className="font-semibold text-[var(--text)]">{b.heading}</p>
              <p className="mt-1">{b.text}</p>
            </div>
          ))}
        </div>
      </details>
    </div>
  );
}

function AiCard({
  ai,
  marketType,
  useAiRequested,
  geminiModel,
}: {
  ai?: SignalResponse["ai"];
  marketType: MarketType;
  useAiRequested: boolean;
  geminiModel?: string;
}) {
  return (
    <div className="hud-ai-shell p-6">
      <h2 className="font-display text-sm font-semibold tracking-wide text-[var(--text)]">AI explanation</h2>
      <p className="font-data text-[10px] tracking-widest text-[var(--text-muted)]">OPTIONAL · GOOGLE GEMINI</p>
      <div className="mt-3 space-y-2 rounded-lg border border-[var(--accent)]/20 bg-black/25 p-3 text-xs leading-relaxed text-[var(--text-muted)]">
        <p>{aiWriteup.summary}</p>
        <p>{aiWriteup.confidence}</p>
      </div>

      {!useAiRequested ? (
        <p className="mt-4 text-sm text-[var(--text-muted)]">AI explanations are turned off. Enable the header toggle to fetch Gemini.</p>
      ) : !ai ? (
        <p className="mt-4 text-sm text-[var(--text-muted)]">No AI block in response.</p>
      ) : (
        <>
          <div className="mt-4">
            <p className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">Confidence</p>
            <p className="font-data mt-1 text-2xl text-[var(--accent-2)] [text-shadow:0_0_24px_rgba(0,207,253,0.35)]">
              {ai.confidence}
            </p>
          </div>
          <div className="mt-4">
            <p className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">Reason</p>
            <p className="mt-2 text-sm leading-relaxed text-[var(--text)]">{ai.reason}</p>
          </div>
          {marketType === "futures" && ai.leverage && (
            <div className="mt-4 rounded-lg border border-[var(--accent)]/30 bg-[var(--accent)]/10 px-3 py-2">
              <p className="text-[10px] uppercase tracking-wider text-[var(--accent-2)]">Leverage note</p>
              <p className="mt-1 text-sm text-[var(--text)]">{ai.leverage}</p>
            </div>
          )}
          {geminiModel && (
            <p className="font-data mt-4 text-[10px] text-[var(--text-muted)]">Model: {geminiModel}</p>
          )}
        </>
      )}
    </div>
  );
}

function fmt(n: number) {
  if (!Number.isFinite(n)) return "—";
  if (n >= 1000) return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
  return n.toLocaleString(undefined, { maximumFractionDigits: 6 });
}
