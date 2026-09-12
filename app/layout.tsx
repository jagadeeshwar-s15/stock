import type { Metadata, Viewport } from "next";
import { JetBrains_Mono, Plus_Jakarta_Sans } from "next/font/google";

import { AppShell } from "@/components/shell/app-shell";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  display: "swap",
});

const mono = JetBrains_Mono({
  variable: "--font-mono-code",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Stock Price Movement Predictor",
    template: "%s · Stock Price Movement Predictor",
  },
  description:
    "Leak-free next-day direction classification for the NIFTY 50 index: naive baselines, engineered technical indicators and an honest chronological evaluation.",
  applicationName: "Stock Price Movement Predictor",
  authors: [{ name: "Stock Price Movement Predictor project" }],
};

export const viewport: Viewport = {
  themeColor: "#0b1437",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${jakarta.variable} ${mono.variable} h-full`} data-scroll-behavior="smooth">
      <body className="min-h-full">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
