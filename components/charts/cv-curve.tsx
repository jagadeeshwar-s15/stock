"use client";

import { useState } from "react";

import { ChartTooltip, TooltipRow } from "./chart-ui";
import { useChartWidth } from "./use-chart-width";
import { CHART, SERIES } from "@/lib/chart-theme";
import { clamp, extent, linePath, niceTicks, padDomain, scaleLinear } from "@/lib/chart-math";
import { pct } from "@/lib/format";
import type { CvModel } from "@/lib/dashboard-types";

/**
 * Mean validation accuracy per regularisation strength C, with a ±1 s.d. band
 * across folds and a ring on the value each search selected.
 */
export function CvCurve({ models, height = 250 }: { models: CvModel[]; height?: number }) {
  const { ref, width } = useChartWidth();
  const [cursor, setCursor] = useState<number | null>(null);

  const grid = models[0]?.results.map((result) => result.C) ?? [];
  if (grid.length === 0) return null;

  const compact = width < 560;
  const padding = { top: 14, right: compact ? 12 : 18, bottom: 38, left: compact ? 46 : 58 };
  const plotWidth = Math.max(10, width - padding.left - padding.right);
  const plotHeight = Math.max(10, height - padding.top - padding.bottom);

  const values = models.flatMap((model) =>
    model.results.flatMap((result) => [
      result.meanValidationAccuracy - result.stdValidationAccuracy,
      result.meanValidationAccuracy + result.stdValidationAccuracy,
    ]),
  );
  const domain = padDomain(extent(values), 0.1);
  const x = scaleLinear([0, grid.length - 1], [padding.left, padding.left + plotWidth]);
  const y = scaleLinear(domain, [padding.top + plotHeight, padding.top]);
  const baseline = padding.top + plotHeight;

  function handlePointer(event: React.PointerEvent<SVGSVGElement>) {
    const bounds = event.currentTarget.getBoundingClientRect();
    const scale = bounds.width > 0 ? width / bounds.width : 1;
    const localX = (event.clientX - bounds.left) * scale;
    const ratio = clamp((localX - padding.left) / (plotWidth || 1), 0, 1);
    setCursor(Math.round(ratio * (grid.length - 1)));
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
        aria-label={`Mean validation accuracy by regularisation strength. ${models
          .map((model) => `${model.label} selected C ${model.bestC}`)
          .join("; ")}.`}
        onPointerMove={handlePointer}
        onPointerLeave={() => setCursor(null)}
        onKeyDown={(event) => {
          if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
          event.preventDefault();
          setCursor((current) =>
            clamp((current ?? 0) + (event.key === "ArrowRight" ? 1 : -1), 0, grid.length - 1),
          );
        }}
        onBlur={() => setCursor(null)}
        className="touch-pan-y outline-none"
      >
        {niceTicks(domain[0], domain[1], compact ? 3 : 4).map((tick) => {
          const ty = y(tick);
          if (ty < padding.top - 1 || ty > baseline + 1) return null;
          return (
            <g key={tick}>
              <line x1={padding.left} x2={padding.left + plotWidth} y1={ty} y2={ty} stroke={CHART.grid} strokeWidth={1} />
              <text x={padding.left - 8} y={ty + 3.5} textAnchor="end" fontSize={11} fill={CHART.muted}>
                {pct(tick, 0)}
              </text>
            </g>
          );
        })}

        {models.map((model) => {
          const color = model.key === "raw" ? SERIES.raw : SERIES.engineered;
          const upper = model.results.map((result, index) => ({
            x: x(index),
            y: y(result.meanValidationAccuracy + result.stdValidationAccuracy),
          }));
          const lower = model.results.map((result, index) => ({
            x: x(index),
            y: y(result.meanValidationAccuracy - result.stdValidationAccuracy),
          }));
          const band = `${linePath(upper)} L${lower[lower.length - 1].x} ${lower[lower.length - 1].y} ${linePath(
            [...lower].reverse(),
          ).slice(1)} Z`;
          const line = model.results.map((result, index) => ({ x: x(index), y: y(result.meanValidationAccuracy) }));
          return (
            <g key={model.key}>
              <path d={band} fill={color} opacity={0.09} />
              <path d={linePath(line)} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" />
              {model.results.map((result, index) => {
                const selected = result.C === model.bestC;
                return (
                  <circle
                    key={result.C}
                    cx={x(index)}
                    cy={y(result.meanValidationAccuracy)}
                    r={selected ? 6 : 3.5}
                    fill={selected ? CHART.surface : color}
                    stroke={color}
                    strokeWidth={selected ? 2.5 : 2}
                  />
                );
              })}
            </g>
          );
        })}

        {grid.map((value, index) => (
          <text key={value} x={x(index)} y={height - 20} fontSize={11} fill={CHART.muted} textAnchor="middle">
            {value < 1 ? value.toString() : value.toLocaleString("en-US")}
          </text>
        ))}
        <text x={padding.left + plotWidth / 2} y={height - 5} fontSize={11} fill={CHART.axis} textAnchor="middle">
          Inverse regularisation strength C (weaker regularisation to the right)
        </text>

        {cursor != null ? (
          <line x1={x(cursor)} x2={x(cursor)} y1={padding.top} y2={baseline} stroke={CHART.ink2} strokeWidth={1} />
        ) : null}
      </svg>

      {cursor != null ? (
        <ChartTooltip x={x(cursor)} y={padding.top} width={width}>
          <p className="mb-1 font-semibold text-ink">C = {grid[cursor]}</p>
          {models.map((model) => (
            <TooltipRow
              key={model.key}
              label={model.label}
              color={model.key === "raw" ? SERIES.raw : SERIES.engineered}
              value={pct(model.results[cursor].meanValidationAccuracy)}
            />
          ))}
        </ChartTooltip>
      ) : null}
    </div>
  );
}
