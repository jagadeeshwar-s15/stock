"use client";

import { useMemo, useState } from "react";

import { ChartTooltip, TooltipRow } from "./chart-ui";
import { useChartWidth } from "./use-chart-width";
import { CHART, DIRECTION } from "@/lib/chart-theme";
import { areaPath, extent, linePath, nearestIndex, niceTicks, padDomain, scaleLinear, tickIndices } from "@/lib/chart-math";
import { day, int, monthYear, num } from "@/lib/format";
import type { PricePoint } from "@/lib/dashboard-types";

/**
 * Closing level over time with an optional shaded test window. Hovering (or
 * arrowing with the keyboard) reads out the exact session.
 */
export function PriceArea({
  points,
  testStart,
  height = 260,
  label = "NIFTY 50 close",
}: {
  points: PricePoint[];
  testStart?: string | null;
  height?: number;
  label?: string;
}) {
  const { ref, width } = useChartWidth();
  const [cursor, setCursor] = useState<number | null>(null);

  const compact = width < 560;

  const geometry = useMemo(() => {
    const domain = padDomain(extent(points.map((point) => point.c)), 0.08);
    const ticks = niceTicks(domain[0], domain[1], compact ? 3 : 4);
    // Size the gutter from the widest tick label so axis values are never clipped.
    const widest = Math.max(...ticks.map((tick) => int(tick).length), 3);
    const padding = {
      top: 12,
      right: compact ? 10 : 14,
      bottom: 24,
      left: Math.min(90, Math.max(34, widest * 6.6 + 12)),
    };
    const plotWidth = Math.max(10, width - padding.left - padding.right);
    const plotHeight = Math.max(10, height - padding.top - padding.bottom);
    const x = scaleLinear([0, Math.max(points.length - 1, 1)], [padding.left, padding.left + plotWidth]);
    const y = scaleLinear(domain, [padding.top + plotHeight, padding.top]);
    return {
      x,
      y,
      domain,
      ticks,
      padding,
      plotWidth,
      plotHeight,
      coords: points.map((point, index) => ({ x: x(index), y: y(point.c) })),
      testIndex: testStart ? points.findIndex((point) => point.d >= testStart) : -1,
    };
  }, [compact, height, points, testStart, width]);

  const { padding, plotWidth, plotHeight } = geometry;

  if (points.length < 2) return null;

  const rising = points[points.length - 1].c >= points[0].c;
  const color = rising ? DIRECTION.up : DIRECTION.down;
  const gradientId = `price-${rising ? "up" : "down"}`;
  const baseline = padding.top + plotHeight;
  const active = cursor == null ? null : points[cursor];

  function handlePointer(event: React.PointerEvent<SVGSVGElement>) {
    const bounds = event.currentTarget.getBoundingClientRect();
    // The SVG scales to its container before the first measurement lands.
    const scale = bounds.width > 0 ? width / bounds.width : 1;
    setCursor(nearestIndex(points.length, (event.clientX - bounds.left) * scale, padding.left, plotWidth));
  }

  function handleKey(event: React.KeyboardEvent<SVGSVGElement>) {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    setCursor((current) => {
      const start = current ?? points.length - 1;
      const step = event.key === "ArrowRight" ? 1 : -1;
      return Math.min(points.length - 1, Math.max(0, start + step));
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
        aria-label={`${label} from ${day(points[0].d)} to ${day(points[points.length - 1].d)}, ${int(points.length)} sessions. Latest close ${num(points[points.length - 1].c)}.`}
        onPointerMove={handlePointer}
        onPointerLeave={() => setCursor(null)}
        onKeyDown={handleKey}
        onBlur={() => setCursor(null)}
        className="touch-pan-y outline-none"
      >
        <defs>
          <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.2} />
            <stop offset="100%" stopColor={color} stopOpacity={0.01} />
          </linearGradient>
        </defs>

        {geometry.ticks.map((tick) => {
          const y = geometry.y(tick);
          if (y < padding.top - 1 || y > baseline + 1) return null;
          return (
            <g key={tick}>
              <line x1={padding.left} x2={padding.left + plotWidth} y1={y} y2={y} stroke={CHART.grid} strokeWidth={1} />
              <text x={padding.left - 8} y={y + 3.5} textAnchor="end" fontSize={11} fill={CHART.muted}>
                {int(tick)}
              </text>
            </g>
          );
        })}

        {geometry.testIndex > 0 ? (
          <g>
            <rect
              x={geometry.x(geometry.testIndex)}
              y={padding.top}
              width={padding.left + plotWidth - geometry.x(geometry.testIndex)}
              height={plotHeight}
              fill={CHART.accentSoft}
              opacity={0.75}
            />
            <line
              x1={geometry.x(geometry.testIndex)}
              x2={geometry.x(geometry.testIndex)}
              y1={padding.top}
              y2={baseline}
              stroke={CHART.accent}
              strokeWidth={1}
            />
            <text
              x={geometry.x(geometry.testIndex) + 6}
              y={padding.top + 12}
              fontSize={10.5}
              fill={CHART.accent}
              fontWeight={600}
            >
              Test window
            </text>
          </g>
        ) : null}

        <path d={areaPath(geometry.coords, baseline)} fill={`url(#${gradientId})`} />
        <path d={linePath(geometry.coords)} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" />

        {tickIndices(points.length, compact ? 3 : 6).map((index) => (
          <text
            key={index}
            x={geometry.x(index)}
            y={height - 7}
            fontSize={11}
            fill={CHART.muted}
            textAnchor={index === 0 ? "start" : index === points.length - 1 ? "end" : "middle"}
          >
            {monthYear(points[index].d)}
          </text>
        ))}

        {cursor != null ? (
          <g>
            <line
              x1={geometry.x(cursor)}
              x2={geometry.x(cursor)}
              y1={padding.top}
              y2={baseline}
              stroke={CHART.ink2}
              strokeWidth={1}
            />
            <circle
              cx={geometry.x(cursor)}
              cy={geometry.y(points[cursor].c)}
              r={4.5}
              fill={color}
              stroke={CHART.surface}
              strokeWidth={2}
            />
          </g>
        ) : null}
      </svg>

      {active ? (
        <ChartTooltip x={geometry.x(cursor as number)} y={geometry.y(active.c)} width={width}>
          <p className="mb-1 font-semibold text-ink">{day(active.d)}</p>
          <TooltipRow label="Close" value={num(active.c)} color={color} />
        </ChartTooltip>
      ) : null}
    </div>
  );
}
