"use client";

import { useState } from "react";

import { Legend } from "./chart-ui";
import { MultiLineChart, type LineSeries } from "./multi-line-chart";
import { CHART, DIRECTION, SERIES } from "@/lib/chart-theme";
import { classNames, type ValueFormat } from "@/lib/format";
import type { IndicatorPoint } from "@/lib/dashboard-types";

type ViewId = "trend" | "momentum" | "macd" | "volatility" | "volume";

interface View {
  id: ViewId;
  label: string;
  description: string;
  series: { key: keyof IndicatorPoint; label: string; color: string }[];
  /** Precise format for the tooltip. */
  valueFormat: ValueFormat;
  /** Shorter format for axis ticks, so the gutter stays narrow. */
  axisFormat: ValueFormat;
  domain?: [number, number];
  references?: { value: number; label: string; color?: string }[];
}

const VIEWS: View[] = [
  {
    id: "trend",
    label: "Trend",
    description: "Close against its 20-session simple and exponential moving averages.",
    series: [
      { key: "close", label: "Close", color: CHART.ink },
      { key: "sma20", label: "SMA 20", color: SERIES.engineered },
      { key: "ema20", label: "EMA 20", color: SERIES.raw },
    ],
    valueFormat: { kind: "number", digits: 2 },
    axisFormat: { kind: "integer" },
  },
  {
    id: "momentum",
    label: "RSI 14",
    description: "Wilder's Relative Strength Index; 30 and 70 are the conventional reference levels.",
    series: [{ key: "rsi14", label: "RSI 14", color: SERIES.engineered }],
    valueFormat: { kind: "number", digits: 1 },
    axisFormat: { kind: "integer" },
    domain: [0, 100],
    references: [
      { value: 70, label: "70", color: DIRECTION.down },
      { value: 30, label: "30", color: DIRECTION.up },
    ],
  },
  {
    id: "macd",
    label: "MACD",
    description: "MACD line, its signal line and the histogram between them, in index points.",
    series: [
      { key: "macd", label: "MACD", color: SERIES.engineered },
      { key: "macdSignal", label: "Signal", color: SERIES.raw },
      { key: "macdHist", label: "Histogram", color: CHART.muted },
    ],
    valueFormat: { kind: "number", digits: 1 },
    axisFormat: { kind: "integer" },
    references: [{ value: 0, label: "0" }],
  },
  {
    id: "volatility",
    label: "Volatility",
    description: "Standard deviation of daily returns over a trailing 20-session window.",
    series: [{ key: "volatility20", label: "Rolling volatility 20", color: SERIES.engineered }],
    valueFormat: { kind: "percent", digits: 2 },
    axisFormat: { kind: "percent", digits: 1 },
  },
  {
    id: "volume",
    label: "Volume change",
    description: "Day-over-day change in reported volume; gaps are sessions without reported volume.",
    series: [{ key: "volumeChange", label: "Volume change", color: SERIES.raw }],
    valueFormat: { kind: "percent", digits: 1 },
    axisFormat: { kind: "percent", digits: 0 },
    references: [{ value: 0, label: "0%" }],
  },
];

/** Tabbed explorer over the most recent sessions of every engineered feature. */
export function IndicatorExplorer({ points }: { points: IndicatorPoint[] }) {
  const [view, setView] = useState<ViewId>("trend");
  const active = VIEWS.find((item) => item.id === view) ?? VIEWS[0];
  const dates = points.map((point) => point.d);

  const series: LineSeries[] = active.series.map((item) => ({
    key: String(item.key),
    label: item.label,
    color: item.color,
    values: points.map((point) => point[item.key] as number | null),
  }));

  return (
    <div className="flex flex-col gap-3">
      <div className="table-scroll flex gap-1 rounded-xl bg-subtle p-1">
        {VIEWS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setView(item.id)}
            aria-pressed={item.id === view}
            className={classNames(
              "min-h-[36px] whitespace-nowrap rounded-lg px-3 py-2 text-[12.5px] font-semibold transition-colors",
              item.id === view ? "bg-surface text-ink shadow-[var(--shadow-card)]" : "text-ink-3 hover:text-ink-2",
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      <p className="text-[12.5px] leading-relaxed text-ink-3">{active.description}</p>

      <MultiLineChart
        dates={dates}
        series={series}
        valueFormat={active.valueFormat}
        axisFormat={active.axisFormat}
        domain={active.domain}
        referenceLines={active.references}
        ariaLabel={`${active.label} over the last ${points.length} sessions`}
      />

      {series.length > 1 ? <Legend items={series.map((item) => ({ label: item.label, color: item.color }))} /> : null}
    </div>
  );
}
