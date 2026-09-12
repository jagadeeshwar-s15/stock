"use client";

import { useMemo, useState } from "react";

import { ChartTooltip } from "./chart-ui";
import { useChartWidth } from "./use-chart-width";
import { CHART, DIRECTION, approachColor } from "@/lib/chart-theme";
import { clamp, tickIndices } from "@/lib/chart-math";
import { day, int, monthYear, pct } from "@/lib/format";
import type { PredictionRow } from "@/lib/dashboard-types";

type Series = "engineered" | "raw" | "persistence" | "majority";

/**
 * Actual versus predicted next-day direction across the whole test window.
 *
 * Each session is one tick in two lanes (actual, predicted). Inside a lane an
 * UP tick sits in the upper half and a DOWN tick in the lower half, so
 * direction is carried by position as well as colour. A third lane marks the
 * sessions the approach got wrong.
 */
export function DirectionTimeline({
  predictions,
  series,
  label,
  height = 190,
}: {
  predictions: PredictionRow[];
  series: Series;
  label: string;
  height?: number;
}) {
  const { ref, width } = useChartWidth();
  const [cursor, setCursor] = useState<number | null>(null);

  const compact = width < 560;
  const padding = { top: 8, right: 8, bottom: 22, left: compact ? 62 : 78 };
  const plotWidth = Math.max(10, width - padding.left - padding.right);
  const laneHeight = 34;
  const laneGap = 10;

  const rows = useMemo(
    () => [
      { key: "actual" as const, title: "Actual", get: (row: PredictionRow) => row.actual },
      { key: "predicted" as const, title: "Predicted", get: (row: PredictionRow) => row[series] as 0 | 1 },
    ],
    [series],
  );

  const correct = predictions.filter((row) => row[series] === row.actual).length;
  const step = plotWidth / Math.max(predictions.length, 1);
  const tickWidth = Math.max(1, Math.min(3, step - 0.3));
  const color = approachColor(series);
  const active = cursor == null ? null : predictions[cursor];

  function positionOf(index: number) {
    return padding.left + index * step + step / 2;
  }

  function handlePointer(event: React.PointerEvent<SVGSVGElement>) {
    const bounds = event.currentTarget.getBoundingClientRect();
    const scale = bounds.width > 0 ? width / bounds.width : 1;
    const localX = (event.clientX - bounds.left) * scale;
    const ratio = clamp((localX - padding.left) / (plotWidth || 1), 0, 0.9999);
    setCursor(Math.min(predictions.length - 1, Math.floor(ratio * predictions.length)));
  }

  function handleKey(event: React.KeyboardEvent<SVGSVGElement>) {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    setCursor((current) => {
      const start = current ?? 0;
      return clamp(start + (event.key === "ArrowRight" ? 1 : -1), 0, predictions.length - 1);
    });
  }

  const totalHeight = padding.top + rows.length * (laneHeight + laneGap) + 16 + padding.bottom;

  return (
    <div ref={ref} className="relative w-full overflow-hidden" style={{ height: Math.max(height, totalHeight) }}>
      <svg
        width="100%"
        height={Math.max(height, totalHeight)}
        viewBox={`0 0 ${width} ${Math.max(height, totalHeight)}`}
        preserveAspectRatio="xMidYMid meet"
        role="img"
        tabIndex={0}
        aria-label={`Actual versus predicted direction for the ${label} approach across ${int(predictions.length)} test sessions from ${day(predictions[0]?.d)} to ${day(predictions[predictions.length - 1]?.d)}. Correct on ${int(correct)} sessions, ${pct(correct / predictions.length)}.`}
        onPointerMove={handlePointer}
        onPointerLeave={() => setCursor(null)}
        onKeyDown={handleKey}
        onBlur={() => setCursor(null)}
        className="touch-pan-y outline-none"
      >
        {rows.map((row, rowIndex) => {
          const top = padding.top + rowIndex * (laneHeight + laneGap);
          return (
            <g key={row.key}>
              <rect x={padding.left} y={top} width={plotWidth} height={laneHeight} rx={6} fill={CHART.surface} />
              <line
                x1={padding.left}
                x2={padding.left + plotWidth}
                y1={top + laneHeight / 2}
                y2={top + laneHeight / 2}
                stroke={CHART.grid}
                strokeWidth={1}
              />
              <text x={padding.left - 8} y={top + 13} textAnchor="end" fontSize={11} fontWeight={600} fill={CHART.ink2}>
                {row.title}
              </text>
              <text x={padding.left - 8} y={top + 27} textAnchor="end" fontSize={10} fill={CHART.axis}>
                UP / DOWN
              </text>
              {predictions.map((point, index) => {
                const up = row.get(point) === 1;
                return (
                  <rect
                    key={point.d}
                    x={positionOf(index) - tickWidth / 2}
                    y={up ? top + 3 : top + laneHeight / 2 + 2}
                    width={tickWidth}
                    height={laneHeight / 2 - 5}
                    fill={up ? DIRECTION.up : DIRECTION.down}
                    opacity={row.key === "predicted" ? 0.95 : 0.8}
                  />
                );
              })}
            </g>
          );
        })}

        {(() => {
          const top = padding.top + rows.length * (laneHeight + laneGap);
          return (
            <g>
              <text x={padding.left - 8} y={top + 10} textAnchor="end" fontSize={11} fontWeight={600} fill={CHART.ink2}>
                Result
              </text>
              {predictions.map((point, index) => {
                const wrong = point[series] !== point.actual;
                return (
                  <rect
                    key={point.d}
                    x={positionOf(index) - tickWidth / 2}
                    y={top}
                    width={tickWidth}
                    height={12}
                    fill={wrong ? DIRECTION.down : color}
                    opacity={wrong ? 0.85 : 0.35}
                  />
                );
              })}
            </g>
          );
        })()}

        {tickIndices(predictions.length, compact ? 3 : 6).map((index) => (
          <text
            key={index}
            x={positionOf(index)}
            y={Math.max(height, totalHeight) - 6}
            fontSize={11}
            fill={CHART.muted}
            textAnchor={index === 0 ? "start" : index === predictions.length - 1 ? "end" : "middle"}
          >
            {monthYear(predictions[index].d)}
          </text>
        ))}

        {cursor != null ? (
          <line
            x1={positionOf(cursor)}
            x2={positionOf(cursor)}
            y1={padding.top - 2}
            y2={padding.top + rows.length * (laneHeight + laneGap) + 14}
            stroke={CHART.ink}
            strokeWidth={1}
          />
        ) : null}
      </svg>

      {active ? (
        <ChartTooltip x={positionOf(cursor as number)} y={padding.top + 6} width={width}>
          <p className="mb-1 font-semibold text-ink">{day(active.d)}</p>
          <div className="flex items-center justify-between gap-4">
            <span className="text-ink-3">Actual</span>
            <span className="font-semibold" style={{ color: active.actual ? DIRECTION.upInk : DIRECTION.downInk }}>
              {active.actual ? "▲ UP" : "▼ DOWN"}
            </span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-ink-3">Predicted</span>
            <span className="font-semibold" style={{ color: active[series] ? DIRECTION.upInk : DIRECTION.downInk }}>
              {active[series] ? "▲ UP" : "▼ DOWN"}
            </span>
          </div>
          {series === "engineered" || series === "raw" ? (
            <div className="flex items-center justify-between gap-4">
              <span className="text-ink-3">P(UP)</span>
              <span className="num font-semibold text-ink">
                {pct(series === "engineered" ? active.engineeredProb : active.rawProb, 1)}
              </span>
            </div>
          ) : null}
          <p className="mt-1 border-t border-line pt-1 text-[11px] font-semibold" style={{ color: active[series] === active.actual ? CHART.ink2 : DIRECTION.downInk }}>
            {active[series] === active.actual ? "Correct" : "Wrong"}
          </p>
        </ChartTooltip>
      ) : null}
    </div>
  );
}
