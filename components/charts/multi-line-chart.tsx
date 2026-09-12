"use client";

import { useMemo, useState } from "react";

import { ChartTooltip, TooltipRow } from "./chart-ui";
import { useChartWidth } from "./use-chart-width";
import { CHART } from "@/lib/chart-theme";
import { extent, linePath, nearestIndex, niceTicks, padDomain, scaleLinear, tickIndices } from "@/lib/chart-math";
import { day, formatWith, monthYear, type ValueFormat } from "@/lib/format";

export interface LineSeries {
  key: string;
  label: string;
  color: string;
  values: (number | null)[];
  width?: number;
}

export interface ReferenceLine {
  value: number;
  label: string;
  color?: string;
}

/**
 * Shared multi-series line chart with a crosshair that reads out every series
 * at the hovered date, so the pointer never has to land on a 2px line.
 *
 * The left gutter is sized from the widest tick label, so axis values are
 * never clipped. The SVG carries a viewBox, so if it paints before the
 * container has been measured it scales to fit instead of overflowing.
 */
export function MultiLineChart({
  dates,
  series,
  height = 240,
  valueFormat,
  axisFormat,
  referenceLines = [],
  domain,
  ariaLabel,
}: {
  dates: string[];
  series: LineSeries[];
  height?: number;
  valueFormat: ValueFormat;
  axisFormat?: ValueFormat;
  referenceLines?: ReferenceLine[];
  domain?: [number, number];
  ariaLabel: string;
}) {
  const { ref, width } = useChartWidth();
  const [cursor, setCursor] = useState<number | null>(null);

  const compact = width < 560;
  const tickFormat = axisFormat ?? valueFormat;
  const tickKind = tickFormat.kind;
  const tickDigits = "digits" in tickFormat ? tickFormat.digits : undefined;

  const geometry = useMemo(() => {
    const format = (value: number) =>
      formatWith({ kind: tickKind, digits: tickDigits } as ValueFormat, value);
    const values = series.flatMap((line) => line.values.filter((value): value is number => value != null));
    const valueDomain = domain ?? padDomain(extent([...values, ...referenceLines.map((line) => line.value)]), 0.12);
    const ticks = niceTicks(valueDomain[0], valueDomain[1], compact ? 3 : 4);
    const widest = Math.max(...ticks.map((tick) => format(tick).length), 3);
    const padding = {
      top: 12,
      right: compact ? 10 : 16,
      bottom: 24,
      left: Math.min(96, Math.max(34, widest * 6.6 + 12)),
    };
    const plotWidth = Math.max(10, width - padding.left - padding.right);
    const plotHeight = Math.max(10, height - padding.top - padding.bottom);
    return {
      padding,
      plotWidth,
      plotHeight,
      ticks,
      format,
      x: scaleLinear([0, Math.max(dates.length - 1, 1)], [padding.left, padding.left + plotWidth]),
      y: scaleLinear(valueDomain, [padding.top + plotHeight, padding.top]),
    };
  }, [compact, dates.length, domain, height, referenceLines, series, tickDigits, tickKind, width]);

  const { padding, plotWidth, plotHeight, x, y, ticks } = geometry;
  const baseline = padding.top + plotHeight;

  function handlePointer(event: React.PointerEvent<SVGSVGElement>) {
    const bounds = event.currentTarget.getBoundingClientRect();
    const scale = bounds.width > 0 ? width / bounds.width : 1;
    setCursor(nearestIndex(dates.length, (event.clientX - bounds.left) * scale, padding.left, plotWidth));
  }

  function handleKey(event: React.KeyboardEvent<SVGSVGElement>) {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    setCursor((current) => {
      const start = current ?? dates.length - 1;
      return Math.min(dates.length - 1, Math.max(0, start + (event.key === "ArrowRight" ? 1 : -1)));
    });
  }

  return (
    <div ref={ref} className="relative w-full overflow-hidden" style={{ height }}>
      <svg
        width="100%"
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="xMidYMid meet"
        role="img"
        tabIndex={0}
        aria-label={ariaLabel}
        onPointerMove={handlePointer}
        onPointerLeave={() => setCursor(null)}
        onKeyDown={handleKey}
        onBlur={() => setCursor(null)}
        className="touch-pan-y outline-none"
      >
        {ticks.map((tick) => {
          const ty = y(tick);
          if (ty < padding.top - 1 || ty > baseline + 1) return null;
          return (
            <g key={tick}>
              <line x1={padding.left} x2={padding.left + plotWidth} y1={ty} y2={ty} stroke={CHART.grid} strokeWidth={1} />
              <text x={padding.left - 8} y={ty + 3.5} textAnchor="end" fontSize={11} fill={CHART.muted}>
                {geometry.format(tick)}
              </text>
            </g>
          );
        })}

        {referenceLines.map((line) => {
          const ty = y(line.value);
          if (ty < padding.top - 1 || ty > baseline + 1) return null;
          return (
            <g key={line.label}>
              <line
                x1={padding.left}
                x2={padding.left + plotWidth}
                y1={ty}
                y2={ty}
                stroke={line.color ?? CHART.muted}
                strokeWidth={1.2}
              />
              <text x={padding.left + plotWidth} y={ty - 5} textAnchor="end" fontSize={10.5} fill={line.color ?? CHART.muted}>
                {line.label}
              </text>
            </g>
          );
        })}

        {series.map((line) => {
          const points = line.values
            .map((value, index) => (value == null ? null : { x: x(index), y: y(value) }))
            .filter((point): point is { x: number; y: number } => point != null);
          if (points.length < 2) return null;
          return (
            <path
              key={line.key}
              d={linePath(points)}
              fill="none"
              stroke={line.color}
              strokeWidth={line.width ?? 2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          );
        })}

        {tickIndices(dates.length, compact ? 3 : 6).map((index) => (
          <text
            key={index}
            x={x(index)}
            y={height - 7}
            fontSize={11}
            fill={CHART.muted}
            textAnchor={index === 0 ? "start" : index === dates.length - 1 ? "end" : "middle"}
          >
            {monthYear(dates[index])}
          </text>
        ))}

        {cursor != null ? (
          <g>
            <line x1={x(cursor)} x2={x(cursor)} y1={padding.top} y2={baseline} stroke={CHART.ink2} strokeWidth={1} />
            {series.map((line) => {
              const value = line.values[cursor];
              if (value == null) return null;
              return (
                <circle
                  key={line.key}
                  cx={x(cursor)}
                  cy={y(value)}
                  r={4}
                  fill={line.color}
                  stroke={CHART.surface}
                  strokeWidth={2}
                />
              );
            })}
          </g>
        ) : null}
      </svg>

      {cursor != null ? (
        <ChartTooltip x={x(cursor)} y={padding.top} width={width}>
          <p className="mb-1 font-semibold text-ink">{day(dates[cursor])}</p>
          {series.map((line) => (
            <TooltipRow
              key={line.key}
              label={line.label}
              color={line.color}
              value={line.values[cursor] == null ? "—" : formatWith(valueFormat, line.values[cursor] as number)}
            />
          ))}
        </ChartTooltip>
      ) : null}
    </div>
  );
}
