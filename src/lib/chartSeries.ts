import type { BinanceKline } from "./binance";
import { klinesToOHLCV } from "./binance";
import { bollinger20, emaSeries } from "./indicators";
import type { ChartPayload, ChartVolumeBar } from "./types";

const BULL = "rgba(0, 255, 127, 0.85)";
const BEAR = "rgba(255, 69, 0, 0.85)";

export function buildChartPayload(rows: BinanceKline[]): ChartPayload {
  const ohlcv = klinesToOHLCV(rows);
  const closes = ohlcv.map((x) => x.c);
  const ema20s = emaSeries(closes, 20);
  const ema50s = emaSeries(closes, 50);
  const bb = bollinger20(closes);

  const candles = ohlcv.map((b) => ({
    time: Math.floor(b.t / 1000),
    open: b.o,
    high: b.h,
    low: b.l,
    close: b.c,
  }));

  const volume: ChartVolumeBar[] = ohlcv.map((b, i) => {
    const up = b.c >= b.o;
    return {
      time: Math.floor(b.t / 1000),
      value: b.v,
      color: up ? BULL : BEAR,
    };
  });

  const ema20: { time: number; value: number }[] = [];
  const ema50: { time: number; value: number }[] = [];
  const bbUpper: { time: number; value: number }[] = [];
  const bbMid: { time: number; value: number }[] = [];
  const bbLower: { time: number; value: number }[] = [];

  for (let i = 0; i < ohlcv.length; i++) {
    const t = Math.floor(ohlcv[i].t / 1000);
    if (Number.isFinite(ema20s[i])) ema20.push({ time: t, value: ema20s[i] });
    if (Number.isFinite(ema50s[i])) ema50.push({ time: t, value: ema50s[i] });
    if (Number.isFinite(bb.up[i])) bbUpper.push({ time: t, value: bb.up[i] });
    if (Number.isFinite(bb.mid[i])) bbMid.push({ time: t, value: bb.mid[i] });
    if (Number.isFinite(bb.low[i])) bbLower.push({ time: t, value: bb.low[i] });
  }

  return { candles, volume, ema20, ema50, bbUpper, bbMid, bbLower };
}
