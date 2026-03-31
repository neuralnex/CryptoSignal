import type { StrategyId } from "@/lib/types";

export const welcomeIntro = {
  title: "Precision-driven analytics",
  lead: `Crypto Signal converts raw market data into clear trading signals. It pulls live candles from the Binance public API at the chart interval you choose (minutes or hours), runs them through technical indicators, applies your chosen strategy, and delivers entry, take-profit, stop-loss, buy/sell/hold, and an optional AI explanation powered by Gemini.`,
  closing: `Built for spot and futures traders who want a fast read on the market—without noise, emotions, or guesswork.`,
};

export const strategyWriteups: Record<
  StrategyId,
  {
    title: string;
    body: string;
    bestFor: string;
    risk: string;
    idealFor: string;
  }
> = {
  hedging: {
    title: "Hedging",
    body: `A defensive approach for uncertain or choppy markets. Hedging looks for mean-reversion when price stretches too far from equilibrium. It favors capital protection, a wider stop-loss, and a moderate take-profit distance.`,
    bestFor: "Slow markets, uncertain trends",
    risk: "Low",
    idealFor: "Intermediate traders",
  },
  trend_following: {
    title: "Trend following",
    body: `Rides strong momentum. Signals lean on EMA alignment, MACD trend direction, and pullback confirmation. The goal is to stay with the trend instead of fighting direction.`,
    bestFor: "Uptrends and downtrends",
    risk: "Medium",
    idealFor: "Beginners and up",
  },
  breakout: {
    title: "Breakout",
    body: `Built for explosive moves. A breakout is confirmed when price closes outside a key volatility boundary and volume is above average. Targets strong price-discovery phases.`,
    bestFor: "Consolidation → expansion",
    risk: "High",
    idealFor: "Intermediate traders",
  },
  scalping: {
    title: "Scalping",
    body: `Very reactive: RSI extremes, MACD histogram shifts, and volatility spikes drive compact TP/SL levels. Suited only to those comfortable with high risk.`,
    bestFor: "High volatility",
    risk: "Very high",
    idealFor: "Advanced traders only",
  },
  qml_ibo: {
    title: "QML-IBO Smart Liquidity Reversal",
    body: `A precision reversal model rooted in Smart Money Concepts. It scans for a Quasimodo Level (QML) formed after a liquidity sweep above a previous swing high (or below a previous swing low), confirms an internal orderflow shift and a break of structure, then signals an entry only when price retraces into the QML origin zone. Risk-reward is fixed at 1:3.`,
    bestFor: "Reversals after liquidity grabs",
    risk: "High",
    idealFor: "Advanced / SMC traders",
  },
};

export const indicatorGuide = [
  {
    name: "EMA20 / EMA50",
    text: "Exponential moving averages for short- and mid-term trend direction.",
  },
  {
    name: "RSI (14)",
    text: "Momentum: readings above ~70 suggest overbought; below ~30 suggest oversold.",
  },
  {
    name: "MACD",
    text: "Trend and momentum via MACD line, signal line, and histogram—used to gauge shifts in buying vs selling pressure.",
  },
  {
    name: "ATR (14)",
    text: "Average True Range measures volatility. Strategy math uses ATR to set TP and SL distance.",
  },
  {
    name: "Bollinger Bands (20, 2σ)",
    text: "Volatility envelope around price; breakouts often involve closes outside upper or lower band.",
  },
  {
    name: "Volume",
    text: "Strength behind moves. The breakout strategy compares current volume to a 20-bar average.",
  },
];

export const mechanicalHowItWorks = {
  title: "How signals are calculated",
  blocks: [
    {
      heading: "Rule-based engine",
      text: "Each strategy follows a fixed rule set—no emotions or guesswork. The app evaluates the last 100 candles at your selected interval, then EMA, RSI, MACD, ATR, Bollinger Bands, volume, volatility, direction bias, and strategy-specific filters. When all required conditions align you get BUY or SELL; when they conflict you get HOLD (no trade).",
    },
    {
      heading: "Entry price",
      text: "Entry equals the last completed candle’s close at that interval so the signal reflects confirmed structure.",
    },
    {
      heading: "Take-profit (TP)",
      text: "TP = Entry ± (ATR × k_tp). The multiplier k_tp depends on the strategy: lower-risk strategies use smaller multipliers; higher-risk strategies use larger ones.",
    },
    {
      heading: "Stop-loss (SL)",
      text: "SL = Entry ∓ (ATR × k_sl), sized from volatility to cap downside.",
    },
  ],
};

export const aiWriteup = {
  summary:
    "The optional AI layer gives a readable summary of the mechanical signal. It does not change TP, SL, or the buy/sell/hold decision—only wording and context.",
  confidence:
    "The confidence label reflects how strongly Gemini sees alignment among price action, indicators, your strategy rules, and market structure. Treat it as qualitative (roughly 0–100%), not a guarantee.",
};

export const riskDisclaimer = `Crypto trading involves significant risk and may result in loss of capital. Signals from this app are for education and research only and are not financial advice. Always do your own analysis and manage risk appropriately.`;

export const footerAttribution = {
  data: "Powered by live data from the Binance Public API.",
  ai: "AI reasoning provided by Google Gemini.",
  mechanical: "TP and SL are mechanical and follow strategy math on the server.",
};
