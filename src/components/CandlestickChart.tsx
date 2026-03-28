"use client";

import type { ChartPayload } from "@/lib/types";
import type { MechanicalSignal } from "@/lib/types";
import {
  CandlestickSeries,
  ColorType,
  createChart,
  CrosshairMode,
  HistogramSeries,
  LineSeries,
  LineStyle,
} from "lightweight-charts";
import type { Time } from "lightweight-charts";
import { useEffect, useRef } from "react";

type Props = {
  chart: ChartPayload;
  mechanical: MechanicalSignal;
  /** Short label for the candle interval (e.g. "15m", "1h"). */
  intervalLabel: string;
  height?: number;
};

function toTime(t: number): Time {
  return t as Time;
}

export function CandlestickChart({ chart, mechanical, intervalLabel, height = 420 }: Props) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<ReturnType<typeof createChart> | null>(null);
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;

    el.innerHTML = "";
    const rect = el.getBoundingClientRect();
    const w = Math.max(rect.width || el.clientWidth || 800, 320);

    const c = createChart(el, {
      width: w,
      height,
      layout: {
        background: { type: ColorType.Solid, color: "#0A0F29" },
        textColor: "#A0A0A0",
        fontSize: 11,
      },
      grid: {
        vertLines: { color: "rgba(92, 77, 255, 0.08)" },
        horzLines: { color: "rgba(92, 77, 255, 0.08)" },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: { color: "rgba(0, 207, 253, 0.35)", width: 1 },
        horzLine: { color: "rgba(0, 207, 253, 0.35)", width: 1 },
      },
      rightPriceScale: { borderColor: "rgba(160, 160, 160, 0.2)" },
      timeScale: { borderColor: "rgba(160, 160, 160, 0.2)", timeVisible: true },
    });

    chartRef.current = c;

    const candle = c.addSeries(CandlestickSeries, {
      upColor: "#00FF7F",
      downColor: "#FF4500",
      borderUpColor: "#00FF7F",
      borderDownColor: "#FF4500",
      wickUpColor: "#00FF7F",
      wickDownColor: "#FF4500",
    });

    candle.setData(
      chart.candles.map((b) => ({
        time: toTime(b.time),
        open: b.open,
        high: b.high,
        low: b.low,
        close: b.close,
      })),
    );

    const ema20 = c.addSeries(LineSeries, {
      color: "#00CFFD",
      lineWidth: 2,
      title: "EMA20",
    });
    ema20.setData(chart.ema20.map((p) => ({ time: toTime(p.time), value: p.value })));

    const ema50 = c.addSeries(LineSeries, {
      color: "#5C4DFF",
      lineWidth: 2,
      title: "EMA50",
    });
    ema50.setData(chart.ema50.map((p) => ({ time: toTime(p.time), value: p.value })));

    const bbU = c.addSeries(LineSeries, {
      color: "rgba(92, 77, 255, 0.45)",
      lineWidth: 1,
      lineStyle: LineStyle.Dotted,
      title: "BB↑",
    });
    bbU.setData(chart.bbUpper.map((p) => ({ time: toTime(p.time), value: p.value })));

    const bbM = c.addSeries(LineSeries, {
      color: "rgba(160, 160, 160, 0.5)",
      lineWidth: 1,
      lineStyle: LineStyle.Dotted,
      title: "BB mid",
    });
    bbM.setData(chart.bbMid.map((p) => ({ time: toTime(p.time), value: p.value })));

    const bbL = c.addSeries(LineSeries, {
      color: "rgba(92, 77, 255, 0.45)",
      lineWidth: 1,
      lineStyle: LineStyle.Dotted,
      title: "BB↓",
    });
    bbL.setData(chart.bbLower.map((p) => ({ time: toTime(p.time), value: p.value })));

    const vol = c.addSeries(HistogramSeries, {
      priceFormat: { type: "volume" },
      priceScaleId: "vol",
      color: "rgba(0, 255, 127, 0.35)",
    });
    vol.setData(
      chart.volume.map((v) => ({
        time: toTime(v.time),
        value: v.value,
        color: v.color,
      })),
    );

    candle.priceScale().applyOptions({ scaleMargins: { top: 0.06, bottom: 0.22 } });
    c.priceScale("vol").applyOptions({ scaleMargins: { top: 0.82, bottom: 0 } });

    if (mechanical.signal === "BUY" || mechanical.signal === "SELL") {
      if (Number.isFinite(mechanical.tp)) {
        candle.createPriceLine({
            price: mechanical.tp,
            color: "#00FF7F",
            lineWidth: 2,
            lineStyle: LineStyle.Dashed,
            axisLabelVisible: true,
            title: "TP",
          });
      }
      if (Number.isFinite(mechanical.sl)) {
        candle.createPriceLine({
          price: mechanical.sl,
          color: "#FF4500",
          lineWidth: 2,
          lineStyle: LineStyle.Dashed,
          axisLabelVisible: true,
          title: "SL",
        });
      }
    }

    const last = chart.candles[chart.candles.length - 1];
    if (last && Number.isFinite(last.close)) {
      candle.createPriceLine({
        price: last.close,
        color: "rgba(249, 250, 251, 0.65)",
        lineWidth: 1,
        lineStyle: LineStyle.Solid,
        axisLabelVisible: true,
        title: "Close",
      });
    }

    c.timeScale().fitContent();

    const ro = new ResizeObserver(() => {
      if (!wrapRef.current || !chartRef.current) return;
      const rw = wrapRef.current.getBoundingClientRect().width;
      chartRef.current.applyOptions({ width: Math.max(rw, 320) });
    });
    ro.observe(el);

    return () => {
      ro.disconnect();
      c.remove();
      chartRef.current = null;
    };
  }, [chart, mechanical, height]);

  return (
    <div className="hud-panel w-full overflow-hidden bg-[#0A0F29]/90">
      <div className="font-display border-b border-[var(--accent-2)]/10 px-3 py-2.5 text-[10px] font-medium uppercase tracking-[0.2em] text-[var(--accent-2)]/80">
        {intervalLabel} · OHLC · EMA20/50 · BOLLINGER · VOL
      </div>
      <div ref={wrapRef} className="w-full min-h-[320px]" style={{ height }} />
    </div>
  );
}
