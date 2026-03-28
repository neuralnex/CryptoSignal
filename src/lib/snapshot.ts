import type { BinanceKline } from "./binance";
import { klinesToOHLCV } from "./binance";
import {
  atr14Wilder,
  averageVolume,
  bollinger20,
  emaSeries,
  macdSeries,
  rsi14Wilder,
} from "./indicators";
import { intervalDurationMs, type ChartInterval } from "./intervals";
import type { IndicatorSnapshot, OHLCV } from "./types";

export function buildIndicatorSnapshot(rows: BinanceKline[], timeframe: ChartInterval): IndicatorSnapshot {
  const ohlcv: OHLCV[] = klinesToOHLCV(rows);
  const closes = ohlcv.map((x) => x.c);
  const volumes = ohlcv.map((x) => x.v);
  const n = ohlcv.length - 1;
  const last = ohlcv[n];
  const lastRow = rows[n];
  const closeTime =
    typeof lastRow[6] === "number"
      ? lastRow[6]
      : last.t + Math.max(intervalDurationMs(timeframe), 60_000) - 1;

  const ema20s = emaSeries(closes, 20);
  const ema50s = emaSeries(closes, 50);
  const rsis = rsi14Wilder(closes);
  const { line, signal, hist } = macdSeries(closes);
  const atrs = atr14Wilder(ohlcv);
  const bb = bollinger20(closes);

  const macdHistPrev =
    n > 0 && Number.isFinite(hist[n - 1]) ? hist[n - 1] : null;

  const snap: IndicatorSnapshot = {
    timeframe,
    openTime: last.t,
    closeTime,
    O: last.o,
    H: last.h,
    L: last.l,
    C: last.c,
    V: last.v,
    ema20: ema20s[n],
    ema50: ema50s[n],
    rsi14: rsis[n],
    macdLine: line[n],
    macdSignal: signal[n],
    macdHist: hist[n],
    macdHistPrev,
    atr14: atrs[n],
    bbUp: bb.up[n],
    bbMid: bb.mid[n],
    bbLow: bb.low[n],
    avgVolume20: averageVolume(volumes, 20),
  };

  const need = [
    snap.ema20,
    snap.ema50,
    snap.rsi14,
    snap.macdHist,
    snap.atr14,
    snap.bbUp,
    snap.bbMid,
    snap.bbLow,
  ];
  if (need.some((x) => !Number.isFinite(x))) {
    throw new Error(
      `Not enough ${timeframe} candles to compute indicators — try another symbol, interval, or wait for data.`,
    );
  }

  return snap;
}
