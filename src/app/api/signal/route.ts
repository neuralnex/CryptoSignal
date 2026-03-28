import { NextResponse } from "next/server";
import { fetchKlines } from "@/lib/binance";
import { buildChartPayload } from "@/lib/chartSeries";
import { enrichWithGemini } from "@/lib/gemini";
import {
  CHART_INTERVAL_OPTIONS,
  DEFAULT_CHART_INTERVAL,
  parseChartInterval,
  type ChartInterval,
} from "@/lib/intervals";
import { buildIndicatorSnapshot } from "@/lib/snapshot";
import { evaluateStrategy } from "@/lib/strategy";
import type { MarketType, SignalResponse, StrategyId } from "@/lib/types";

const STRATEGIES: StrategyId[] = ["hedging", "trend_following", "breakout", "scalping"];

function isStrategy(s: string): s is StrategyId {
  return STRATEGIES.includes(s as StrategyId);
}

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON body" }, { status: 400 });
  }

  const b = body as Record<string, unknown>;
  const symbol = typeof b.symbol === "string" ? b.symbol : "BTCUSDT";
  const strategy = typeof b.strategy === "string" && isStrategy(b.strategy) ? b.strategy : null;
  const marketType: MarketType =
    b.marketType === "futures" || b.marketType === "spot" ? b.marketType : "spot";
  const useAi = b.useAi !== false;

  let interval: ChartInterval = DEFAULT_CHART_INTERVAL;
  if (b.interval !== undefined && b.interval !== null) {
    if (typeof b.interval !== "string") {
      return NextResponse.json(
        { success: false, error: "interval must be a string (Binance kline interval id)" },
        { status: 400 },
      );
    }
    const trimmed = b.interval.trim();
    if (trimmed !== "") {
      const parsed = parseChartInterval(trimmed);
      if (!parsed) {
        const allowed = CHART_INTERVAL_OPTIONS.map((o) => o.id).join(", ");
        return NextResponse.json(
          { success: false, error: `interval must be one of: ${allowed}` },
          { status: 400 },
        );
      }
      interval = parsed;
    }
  }

  if (!strategy) {
    return NextResponse.json(
      {
        success: false,
        error: `strategy must be one of: ${STRATEGIES.join(", ")}`,
      },
      { status: 400 },
    );
  }

  try {
    const klines = await fetchKlines(symbol, interval, 100);
    if (!klines.length) {
      return NextResponse.json({ success: false, error: "No klines returned" }, { status: 502 });
    }

    const indicators = buildIndicatorSnapshot(klines, interval);
    const mechanical = evaluateStrategy(indicators, strategy, marketType);

    const out: SignalResponse = {
      success: true,
      symbol: symbol.toUpperCase(),
      marketType,
      strategy,
      mechanical,
      indicators,
      chart: buildChartPayload(klines),
    };

    const geminiModel = process.env.GEMINI_MODEL ?? "gemini-2.0-flash";
    if (useAi) out.geminiModel = geminiModel;
    const key = process.env.GEMINI_API_KEY;
    if (useAi && key) {
      try {
        const ai = await enrichWithGemini({
          apiKey: key,
          model: geminiModel,
          symbol: symbol.toUpperCase(),
          marketType,
          strategy,
          indicators,
          mechanical,
        });
        if (ai) out.ai = ai;
      } catch (e) {
        out.ai = {
          confidence: "n/a",
          reason: `Gemini error: ${e instanceof Error ? e.message : String(e)}`,
        };
      }
    } else if (useAi && !key) {
      out.ai = {
        confidence: "n/a",
        reason: "Set GEMINI_API_KEY in .env.local to enable AI explanations.",
      };
    }

    return NextResponse.json(out);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ success: false, error: msg }, { status: 502 });
  }
}
