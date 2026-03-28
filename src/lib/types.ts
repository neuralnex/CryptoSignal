import type { ChartInterval } from "./intervals";

export interface OHLCV {
  t: number;
  o: number;
  h: number;
  l: number;
  c: number;
  v: number;
}

export type StrategyId = "hedging" | "trend_following" | "breakout" | "scalping";

export type MarketType = "spot" | "futures";

export type { ChartInterval };

export interface IndicatorSnapshot {
  timeframe: ChartInterval;
  openTime: number;
  closeTime: number;
  O: number;
  H: number;
  L: number;
  C: number;
  V: number;
  ema20: number;
  ema50: number;
  rsi14: number;
  macdLine: number;
  macdSignal: number;
  macdHist: number;
  macdHistPrev: number | null;
  atr14: number;
  bbUp: number;
  bbMid: number;
  bbLow: number;
  avgVolume20: number;
}

export interface MechanicalSignal {
  signal: "BUY" | "SELL" | "HOLD";
  entry: number;
  tp: number;
  sl: number;
  kTp: number;
  kSl: number;
  leverageHint: string;
  checks: Record<string, string | number | boolean>;
}

export interface ChartCandle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
}

export interface ChartLinePoint {
  time: number;
  value: number;
}

export interface ChartVolumeBar {
  time: number;
  value: number;
  color: string;
}

export interface ChartPayload {
  candles: ChartCandle[];
  volume: ChartVolumeBar[];
  ema20: ChartLinePoint[];
  ema50: ChartLinePoint[];
  bbUpper: ChartLinePoint[];
  bbMid: ChartLinePoint[];
  bbLower: ChartLinePoint[];
}

export interface SignalResponse {
  success: boolean;
  symbol: string;
  marketType: MarketType;
  strategy: StrategyId;
  mechanical: MechanicalSignal;
  ai?: {
    confidence: string;
    reason: string;
    leverage?: string;
  };
  indicators: IndicatorSnapshot;
  chart?: ChartPayload;
  geminiModel?: string;
  error?: string;
}
