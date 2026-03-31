import type { IndicatorSnapshot, MarketType, MechanicalSignal, StrategyId } from "./types";

const STRATEGY_KP: Record<StrategyId, { kTp: number; kSl: number }> = {
  hedging: { kTp: 0.8, kSl: 1.5 },
  trend_following: { kTp: 1.8, kSl: 1.0 },
  breakout: { kTp: 2.2, kSl: 0.8 },
  scalping: { kTp: 0.4, kSl: 0.25 },
  qml_ibo: { kTp: 3.0, kSl: 1.0 },
};

function leverageFor(strategy: StrategyId, market: MarketType): string {
  if (market === "spot") {
    return "Spot: no leverage — size positions to your risk budget.";
  }
  switch (strategy) {
    case "hedging":
      return "Futures: prefer 1–3× for defensive hedging.";
    case "trend_following":
      return "Futures: 3–5× typical for trend continuation on this timeframe.";
    case "breakout":
      return "Futures: 5–8× only if you accept gap risk and tight monitoring.";
    case "scalping":
      return "Futures: 10–20× is extremely risky; many traders lose fast at this tier.";
    case "qml_ibo":
      return "Futures: 3–5× recommended for reversal setups; counter-trend entries carry added risk.";
    default:
      return "";
  }
}

function levelsFor(signal: "BUY" | "SELL", C: number, atr: number, kTp: number, kSl: number) {
  const dir = signal === "BUY" ? 1 : -1;
  const tp = C + dir * kTp * atr;
  const sl = C - dir * kSl * atr;
  return { entry: C, tp, sl };
}

export function evaluateStrategy(
  s: IndicatorSnapshot,
  strategy: StrategyId,
  market: MarketType,
): MechanicalSignal {
  const { kTp, kSl } = STRATEGY_KP[strategy];
  const leverageHint = leverageFor(strategy, market);
  const C = s.C;
  const atr = s.atr14;
  const ema20 = s.ema20;
  const ema50 = s.ema50;
  const checks: Record<string, string | number | boolean> = {};

  const mkHold = (extra: Record<string, string | number | boolean>): MechanicalSignal => ({
    signal: "HOLD",
    entry: C,
    tp: C,
    sl: C,
    kTp,
    kSl,
    leverageHint,
    checks: { ...checks, ...extra },
  });

  switch (strategy) {
    case "hedging": {
      const atrOk = atr > 0.007 * C;
      const neutral = Math.abs(ema20 - ema50) < 0.005 * C;
      const buySetup = C <= ema20 - 0.5 * atr;
      const sellSetup = C >= ema20 + 0.5 * atr;
      checks.atr_gt_0_7pct = atrOk;
      checks.neutral_trend = neutral;
      checks.buy_mean_reversion = buySetup;
      checks.sell_mean_reversion = sellSetup;
      if (!atrOk || !neutral) {
        return mkHold({ note: "Hedging needs elevated ATR and a neutral EMA20/EMA50 ribbon." });
      }
      if (buySetup && !sellSetup) {
        const { entry, tp, sl } = levelsFor("BUY", C, atr, kTp, kSl);
        return { signal: "BUY", entry, tp, sl, kTp, kSl, leverageHint, checks };
      }
      if (sellSetup && !buySetup) {
        const { entry, tp, sl } = levelsFor("SELL", C, atr, kTp, kSl);
        return { signal: "SELL", entry, tp, sl, kTp, kSl, leverageHint, checks };
      }
      return mkHold({ note: "No clean mean-reversion trigger vs EMA20." });
    }
    case "trend_following": {
      const uptrend = ema20 > ema50;
      const downtrend = ema20 < ema50;
      const lo = ema20 - 0.3 * atr;
      const hi = ema20 + 0.3 * atr;
      const inBand = C >= lo && C <= hi;
      const buyOk = uptrend && s.macdHist > 0 && inBand;
      const sellOk = downtrend && s.macdHist < 0 && inBand;
      checks.uptrend = uptrend;
      checks.downtrend = downtrend;
      checks.pullback_band = inBand;
      checks.macd_hist = s.macdHist;
      if (buyOk && !sellOk) {
        const { entry, tp, sl } = levelsFor("BUY", C, atr, kTp, kSl);
        return { signal: "BUY", entry, tp, sl, kTp, kSl, leverageHint, checks };
      }
      if (sellOk && !buyOk) {
        const { entry, tp, sl } = levelsFor("SELL", C, atr, kTp, kSl);
        return { signal: "SELL", entry, tp, sl, kTp, kSl, leverageHint, checks };
      }
      return mkHold({ note: "Trend-follow needs aligned EMAs, MACD histogram sign, and a pullback to EMA20." });
    }
    case "breakout": {
      const volOk = s.V > 1.2 * s.avgVolume20;
      const buyBreak = C > s.bbUp;
      const sellBreak = C < s.bbLow;
      checks.volume_gt_1_2x_avg20 = volOk;
      checks.close_gt_bb_upper = buyBreak;
      checks.close_lt_bb_lower = sellBreak;
      checks.bb_width = s.bbUp - s.bbLow;
      checks.one_point_two_atr = 1.2 * atr;
      if (buyBreak && volOk && !sellBreak) {
        const { entry, tp, sl } = levelsFor("BUY", C, atr, kTp, kSl);
        return { signal: "BUY", entry, tp, sl, kTp, kSl, leverageHint, checks };
      }
      if (sellBreak && volOk && !buyBreak) {
        const { entry, tp, sl } = levelsFor("SELL", C, atr, kTp, kSl);
        return { signal: "SELL", entry, tp, sl, kTp, kSl, leverageHint, checks };
      }
      return mkHold({
        note: "Breakout needs a close outside the 20-period Bollinger band with volume > 1.2× the 20-bar average.",
      });
    }
    case "scalping": {
      const volatilityOk = atr > 0.01 * C;
      const prev = s.macdHistPrev;
      const crossedUp = prev !== null && prev <= 0 && s.macdHist > 0;
      const crossedDown = prev !== null && prev >= 0 && s.macdHist < 0;
      checks.high_vol_1pct = volatilityOk;
      checks.rsi = s.rsi14;
      checks.macd_hist = s.macdHist;
      checks.macd_hist_prev = prev ?? "n/a";
      checks.cross_up = crossedUp;
      checks.cross_down = crossedDown;
      if (!volatilityOk) {
        return mkHold({ note: "Scalping filter: ATR must exceed 1% of price." });
      }
      const buyOk = s.rsi14 < 30 && crossedUp;
      const sellOk = s.rsi14 > 70 && crossedDown;
      if (buyOk && !sellOk) {
        const { entry, tp, sl } = levelsFor("BUY", C, atr, kTp, kSl);
        return { signal: "BUY", entry, tp, sl, kTp, kSl, leverageHint, checks };
      }
      if (sellOk && !buyOk) {
        const { entry, tp, sl } = levelsFor("SELL", C, atr, kTp, kSl);
        return { signal: "SELL", entry, tp, sl, kTp, kSl, leverageHint, checks };
      }
      return mkHold({
        note: "Scalp setup needs RSI extreme plus a fresh MACD histogram zero cross.",
      });
    }
    case "qml_ibo": {
      const qml = s.qmlIbo;
      if (!qml) return mkHold({ note: "QML-IBO structural data not available." });

      checks.swing_highs = qml.swingHighCount;
      checks.swing_lows = qml.swingLowCount;

      const { bearish, bullish } = qml;
      checks.bear_ibo = bearish.iboActive;
      checks.bear_hh = bearish.pivotDetected;
      checks.bear_hh_level = bearish.pivotLevel;
      checks.bear_bos_down = bearish.bos;
      checks.bear_sweep = bearish.liquiditySweep;
      checks.bear_shift = bearish.structureShift;
      checks.bear_in_zone = bearish.priceInZone;
      checks.bear_qml_zone = `${bearish.qmlZoneLow.toFixed(2)}–${bearish.qmlZoneHigh.toFixed(2)}`;

      checks.bull_ibo = bullish.iboActive;
      checks.bull_ll = bullish.pivotDetected;
      checks.bull_ll_level = bullish.pivotLevel;
      checks.bull_bos_up = bullish.bos;
      checks.bull_sweep = bullish.liquiditySweep;
      checks.bull_shift = bullish.structureShift;
      checks.bull_in_zone = bullish.priceInZone;
      checks.bull_qml_zone = `${bullish.qmlZoneLow.toFixed(2)}–${bullish.qmlZoneHigh.toFixed(2)}`;

      if (bearish.valid && !bullish.valid) {
        const { entry, tp, sl } = levelsFor("SELL", C, atr, kTp, kSl);
        return { signal: "SELL", entry, tp, sl, kTp, kSl, leverageHint, checks };
      }
      if (bullish.valid && !bearish.valid) {
        const { entry, tp, sl } = levelsFor("BUY", C, atr, kTp, kSl);
        return { signal: "BUY", entry, tp, sl, kTp, kSl, leverageHint, checks };
      }
      return mkHold({
        note: "QML-IBO requires all five conditions (internal orderflow + liquidity sweep + QML zone + BOS + structure shift). No valid setup detected.",
      });
    }
    default:
      return mkHold({ note: "Unknown strategy." });
  }
}
