import type { OHLCV } from "./types";

function smaPeriod(values: number[], period: number, endExclusive: number): number {
  let s = 0;
  for (let i = endExclusive - period; i < endExclusive; i++) s += values[i];
  return s / period;
}

export function emaSeries(values: number[], period: number): number[] {
  const out: number[] = new Array(values.length).fill(NaN);
  if (values.length < period + 1) return out;
  const k = 2 / (period + 1);
  out[period - 1] = smaPeriod(values, period, period);
  for (let i = period; i < values.length; i++) {
    const prev = out[i - 1];
    out[i] = values[i] * k + prev * (1 - k);
  }
  return out;
}

export function rsi14Wilder(closes: number[]): number[] {
  const period = 14;
  const out: number[] = new Array(closes.length).fill(NaN);
  if (closes.length <= period) return out;

  let gain = 0;
  let loss = 0;
  for (let i = 1; i <= period; i++) {
    const ch = closes[i] - closes[i - 1];
    if (ch >= 0) gain += ch;
    else loss -= ch;
  }
  let avgGain = gain / period;
  let avgLoss = loss / period;
  out[period] = 100 - 100 / (1 + (avgLoss === 0 ? Infinity : avgGain / avgLoss));

  for (let i = period + 1; i < closes.length; i++) {
    const ch = closes[i] - closes[i - 1];
    const g = ch > 0 ? ch : 0;
    const l = ch < 0 ? -ch : 0;
    avgGain = (avgGain * (period - 1) + g) / period;
    avgLoss = (avgLoss * (period - 1) + l) / period;
    const rs = avgLoss === 0 ? Infinity : avgGain / avgLoss;
    out[i] = 100 - 100 / (1 + rs);
  }
  return out;
}

export function macdSeries(closes: number[]): {
  line: number[];
  signal: number[];
  hist: number[];
} {
  const ema12 = emaSeries(closes, 12);
  const ema26 = emaSeries(closes, 26);
  const line: number[] = closes.map((_, i) =>
    Number.isFinite(ema12[i]) && Number.isFinite(ema26[i]) ? ema12[i] - ema26[i] : NaN,
  );
  const start = line.findIndex((x) => Number.isFinite(x));
  const signal: number[] = closes.map(() => NaN);
  const hist: number[] = closes.map(() => NaN);
  if (start < 0) return { line, signal, hist };

  const macdTail = line.slice(start);
  const sigTail = emaSeries(macdTail, 9);
  for (let j = 0; j < macdTail.length; j++) {
    const i = start + j;
    signal[i] = sigTail[j];
    if (Number.isFinite(line[i]) && Number.isFinite(signal[i])) {
      hist[i] = line[i] - signal[i];
    }
  }
  return { line, signal, hist };
}

export function atr14Wilder(ohlcv: OHLCV[]): number[] {
  const period = 14;
  const out: number[] = new Array(ohlcv.length).fill(NaN);
  if (ohlcv.length <= period) return out;

  const tr: number[] = [ohlcv[0].h - ohlcv[0].l];
  for (let i = 1; i < ohlcv.length; i++) {
    const h = ohlcv[i].h;
    const l = ohlcv[i].l;
    const pc = ohlcv[i - 1].c;
    tr.push(Math.max(h - l, Math.abs(h - pc), Math.abs(l - pc)));
  }

  let sum = 0;
  for (let i = 0; i < period; i++) sum += tr[i];
  let atr = sum / period;
  out[period - 1] = atr;
  for (let i = period; i < ohlcv.length; i++) {
    atr = (atr * (period - 1) + tr[i]) / period;
    out[i] = atr;
  }
  return out;
}

export function bollinger20(closes: number[]): {
  mid: number[];
  up: number[];
  low: number[];
} {
  const p = 20;
  const mid: number[] = closes.map(() => NaN);
  const up = closes.map(() => NaN);
  const low = closes.map(() => NaN);
  for (let i = p - 1; i < closes.length; i++) {
    const slice = closes.slice(i - p + 1, i + 1);
    const m = slice.reduce((a, b) => a + b, 0) / p;
    const variance = slice.reduce((a, b) => a + (b - m) ** 2, 0) / p;
    const sd = Math.sqrt(variance);
    mid[i] = m;
    up[i] = m + 2 * sd;
    low[i] = m - 2 * sd;
  }
  return { mid, up, low };
}

export function averageVolume(volumes: number[], bars: number): number {
  const n = Math.min(bars, volumes.length);
  if (n === 0) return 0;
  let s = 0;
  for (let i = volumes.length - n; i < volumes.length; i++) s += volumes[i];
  return s / n;
}
