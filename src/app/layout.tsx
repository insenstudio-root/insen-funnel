import type { Metadata } from "next";
import { Fraunces, Instrument_Sans } from "next/font/google";
import "./globals.css";

const fraunces = Fraunces({
  subsets: ["latin"], weight: ["400", "500"], variable: "--font-fraunces", display: "swap",
});
const instrument = Instrument_Sans({
  subsets: ["latin"], weight: ["400", "500"], variable: "--font-instrument", display: "swap",
});

export const metadata: Metadata = {
  title: "INSEN Studio",
  description: "Parlons de votre projet.",
  robots: { index: false, follow: false }, // funnel de conversion, hors index
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`${fraunces.variable} ${instrument.variable}`}>
      <body>{children}</body>
    </html>
  );
}
