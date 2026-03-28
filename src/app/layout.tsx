import type { Metadata } from "next";
import { JetBrains_Mono, Orbitron, Outfit } from "next/font/google";
import "./globals.css";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
});

const orbitron = Orbitron({
  subsets: ["latin"],
  variable: "--font-orbitron",
  weight: ["400", "500", "600", "700"],
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
});

export const metadata: Metadata = {
  title: "Crypto Signal — multi-timeframe analytics",
  description:
    "Live Binance candles (minute and hour intervals), mechanical entry/TP/SL by strategy, optional Gemini explanations. Research only.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${outfit.variable} ${orbitron.variable} ${jetbrainsMono.variable}`}>
      <body className="font-ui min-h-screen antialiased">
        <div className="hud-bg" aria-hidden />
        <div className="hud-grid" aria-hidden />
        {children}
      </body>
    </html>
  );
}
