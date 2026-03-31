import { GoogleGenAI } from "@google/genai";
import { intervalHumanForAi } from "./intervals";
import type { IndicatorSnapshot, MechanicalSignal, MarketType, StrategyId } from "./types";

const STRATEGY_MATH: Record<StrategyId, (timeframeHuman: string) => string> = {
  hedging: (tf) => `
HEDGING (${tf} chart): k_tp=0.8, k_sl=1.5 on ATR14. Universal: TP = C + direction*k_tp*ATR, SL = C - direction*k_sl*ATR (direction +1 BUY / -1 SELL).
Filters: ATR14 > 0.007*C; abs(EMA20-EMA50) < 0.005*C; BUY if C <= EMA20 - 0.5*ATR14; SELL if C >= EMA20 + 0.5*ATR14.
`.trim(),
  trend_following: (tf) => `
TREND FOLLOWING (${tf} chart): k_tp=1.8, k_sl=1.0. Uptrend: EMA20>EMA50; downtrend: EMA20<EMA50. MACD_hist >0 for longs, <0 for shorts.
Pullback band: EMA20 - 0.3*ATR14 <= C <= EMA20 + 0.3*ATR14.
`.trim(),
  breakout: (tf) => `
BREAKOUT (${tf} chart): k_tp=2.2, k_sl=0.8. BUY if C > BB_upper and V > 1.2*average_volume_20; SELL if C < BB_lower with same volume rule.
`.trim(),
  scalping: (tf) => `
SCALPING (${tf} chart): k_tp=0.4, k_sl=0.25. Require ATR14 > 0.01*C. BUY: RSI14<30 and MACD histogram crosses above 0. SELL: RSI14>70 and histogram crosses below 0.
`.trim(),
  qml_ibo: (tf) => `
QML-IBO SMART LIQUIDITY REVERSAL (${tf} chart): k_tp=3.0, k_sl=1.0 → fixed 1:3 RR.
Five conditions for SELL (bearish): (1) Internal Bearish Orderflow — last bar LH + LL vs prior bar;
(2) Higher High (HH) detected above previous swing high (liquidity sweep ≥ 0.1%);
(3) QML zone = candle range of swing-low origin before HH (± 0.15*ATR buffer);
(4) Break of Structure down — any post-HH low < origin swing-low value;
(5) Current close inside QML zone.
BUY (bullish mirror): same logic inverted — Lower Low sweeps previous swing low, QML zone = swing-high origin, BOS up.
TP = entry ± k_tp*ATR14, SL = entry ∓ k_sl*ATR14 (R = 1*ATR, target = 3*ATR → 1:3 RR).
`.trim(),
};

function extractJsonObject(text: string): string {
  const t = text.trim();
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) return fence[1].trim();
  const start = t.indexOf("{");
  const end = t.lastIndexOf("}");
  if (start >= 0 && end > start) return t.slice(start, end + 1);
  return t;
}

export async function enrichWithGemini(args: {
  apiKey: string;
  model?: string;
  symbol: string;
  marketType: MarketType;
  strategy: StrategyId;
  indicators: IndicatorSnapshot;
  mechanical: MechanicalSignal;
}): Promise<{ confidence: string; reason: string; leverage?: string } | null> {
  const {
    apiKey,
    model = "gemini-2.5-flash",
    symbol,
    marketType,
    strategy,
    indicators,
    mechanical,
  } = args;

  const ai = new GoogleGenAI({ apiKey });
  const tfHuman = intervalHumanForAi(indicators.timeframe);
  const math = STRATEGY_MATH[strategy](tfHuman);
  const payload = {
    symbol,
    marketType,
    strategy,
    mechanical_engine_output: mechanical,
    indicators: {
      ...indicators,
      macdHistPrev: indicators.macdHistPrev,
    },
  };

  const prompt = `You are a disciplined crypto market analyst on the ${tfHuman} timeframe.
The TRADING PAIR is ${symbol}. Market type: ${marketType}.

STRATEGY MATH (authoritative for how the signal was built):
${math}

FULL NUMERIC CONTEXT (JSON):
${JSON.stringify(payload, null, 2)}

The backend already applied the math and produced mechanical_engine_output (signal, entry, tp, sl).
Your job: explain the setup in plain language and give a confidence label.

Rules:
- Do NOT contradict the mechanical signal direction if it is BUY or SELL. If mechanical signal is HOLD, explain why conditions failed.
- Reference EMA20/EMA50, RSI14, MACD histogram, ATR14, Bollinger bands, and volume where useful.
- Keep leverage advice consistent with ${marketType}.

Return JSON ONLY, no markdown:
{"confidence":"72%","reason":"two or three sentences","leverage":"optional short note"}`;

  const response = await ai.models.generateContent({
    model,
    contents: prompt,
  });

  const raw = response.text;
  if (!raw) return null;

  try {
    const parsed = JSON.parse(extractJsonObject(raw)) as {
      confidence?: string;
      reason?: string;
      leverage?: string;
    };
    if (!parsed.reason) return null;
    return {
      confidence: parsed.confidence ?? "n/a",
      reason: parsed.reason,
      leverage: parsed.leverage,
    };
  } catch {
    return {
      confidence: "n/a",
      reason: raw.slice(0, 2000),
    };
  }
}
