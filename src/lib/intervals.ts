export const CHART_INTERVAL_OPTIONS = [
  { id: "1m", label: "1m", caption: "1 minute" },
  { id: "3m", label: "3m", caption: "3 minutes" },
  { id: "5m", label: "5m", caption: "5 minutes" },
  { id: "15m", label: "15m", caption: "15 minutes" },
  { id: "30m", label: "30m", caption: "30 minutes" },
  { id: "1h", label: "1h", caption: "1 hour" },
  { id: "2h", label: "2h", caption: "2 hours" },
  { id: "4h", label: "4h", caption: "4 hours" },
  { id: "6h", label: "6h", caption: "6 hours" },
  { id: "8h", label: "8h", caption: "8 hours" },
  { id: "12h", label: "12h", caption: "12 hours" },
] as const;

export type ChartInterval = (typeof CHART_INTERVAL_OPTIONS)[number]["id"];

/** When the UI or API omits `interval`, this value is used. */
export const DEFAULT_CHART_INTERVAL: ChartInterval = "1h";

const ALLOWED = new Set<string>(CHART_INTERVAL_OPTIONS.map((o) => o.id));

export function parseChartInterval(raw: unknown): ChartInterval | null {
  if (typeof raw !== "string" || !ALLOWED.has(raw)) return null;
  return raw as ChartInterval;
}

export function intervalCaption(id: ChartInterval): string {
  const row = CHART_INTERVAL_OPTIONS.find((o) => o.id === id);
  return row?.caption ?? id;
}

export function intervalHumanForAi(id: ChartInterval): string {
  if (id.endsWith("m")) {
    const n = id.slice(0, -1);
    return `${n}-minute`;
  }
  if (id.endsWith("h")) {
    const n = id.slice(0, -1);
    return `${n}-hour`;
  }
  return id;
}

/** Binance candle length in ms (open to close), for fallback when close time is missing. */
export function intervalDurationMs(id: ChartInterval): number {
  if (id.endsWith("m")) {
    const n = Number.parseInt(id.slice(0, -1), 10);
    return n * 60_000;
  }
  if (id.endsWith("h")) {
    const n = Number.parseInt(id.slice(0, -1), 10);
    return n * 60 * 60_000;
  }
  return 0;
}
