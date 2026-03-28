import type { ChartInterval } from "./intervals";

export type BinanceKline = [
  number,
  string,
  string,
  string,
  string,
  string,
  number,
  string,
  number,
  string,
  string,
  string,
];

const KLINES = "https://api.binance.com/api/v3/klines";

export async function fetchKlines(
  symbol: string,
  interval: ChartInterval,
  limit = 100,
): Promise<BinanceKline[]> {
  const url = new URL(KLINES);
  url.searchParams.set("symbol", symbol.trim().toUpperCase());
  url.searchParams.set("interval", interval);
  url.searchParams.set("limit", String(limit));

  const res = await fetch(url.toString(), { cache: "no-store" });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Binance ${res.status}: ${body.slice(0, 500)}`);
  }
  return res.json();
}

export function klinesToOHLCV(rows: BinanceKline[]) {
  return rows.map((k) => ({
    t: k[0],
    o: parseFloat(k[1]),
    h: parseFloat(k[2]),
    l: parseFloat(k[3]),
    c: parseFloat(k[4]),
    v: parseFloat(k[5]),
  }));
}
