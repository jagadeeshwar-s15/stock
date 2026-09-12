import { approachColor } from "@/lib/chart-theme";
import { classNames, pct } from "@/lib/format";
import type { Approach } from "@/lib/dashboard-types";

/**
 * Test accuracy with 95% Wilson intervals as a dot-and-whisker plot: point
 * estimates on a truncated axis, so no bar implies a zero baseline and the
 * overlap between approaches stays visible.
 *
 * Built from HTML elements rather than SVG so every label keeps its real font
 * size at any screen width.
 */
export function AccuracyDots({
  approaches,
  reference,
  referenceLabel = "Majority baseline",
}: {
  approaches: Approach[];
  reference?: number;
  referenceLabel?: string;
}) {
  const low = Math.min(0.45, ...approaches.map((a) => a.accuracyCiLow)) - 0.01;
  const high = Math.max(0.6, ...approaches.map((a) => a.accuracyCiHigh)) + 0.01;
  const position = (value: number) => ((value - low) / (high - low)) * 100;
  const ticks = [0.45, 0.5, 0.55, 0.6].filter((tick) => tick >= low && tick <= high);

  return (
    <div>
      <ul className="flex flex-col gap-3.5">
        {approaches.map((approach) => {
          const color = approachColor(approach.key);
          const left = position(approach.accuracyCiLow);
          const right = position(approach.accuracyCiHigh);
          return (
            <li key={approach.key}>
              <div className="mb-1.5 flex items-baseline justify-between gap-3">
                <span className="flex min-w-0 items-center gap-2 text-[12.5px] font-semibold text-ink">
                  <span aria-hidden className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: color }} />
                  <span className="truncate">{approach.label}</span>
                  <span className="shrink-0 rounded-full bg-subtle px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-ink-3">
                    {approach.kind}
                  </span>
                </span>
                <span className="num shrink-0 text-[13px] font-bold text-ink">{pct(approach.accuracy)}</span>
              </div>
              <div className="relative h-5">
                <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-line" />
                {ticks.map((tick) => (
                  <div
                    key={tick}
                    aria-hidden
                    className="absolute top-1/2 h-2.5 w-px -translate-y-1/2 bg-line-strong"
                    style={{ left: `${position(tick)}%` }}
                  />
                ))}
                {reference != null ? (
                  <div
                    aria-hidden
                    className="absolute top-1/2 h-4 w-px -translate-y-1/2 bg-base-2"
                    style={{ left: `${position(reference)}%` }}
                  />
                ) : null}
                <div
                  className="absolute top-1/2 h-[3px] -translate-y-1/2 rounded-full opacity-35"
                  style={{ left: `${left}%`, width: `${Math.max(right - left, 0.4)}%`, backgroundColor: color }}
                />
                <div
                  className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-surface"
                  style={{ left: `${position(approach.accuracy)}%`, backgroundColor: color }}
                />
              </div>
            </li>
          );
        })}
      </ul>

      <div className="relative mt-1 h-4">
        {ticks.map((tick) => (
          <span
            key={tick}
            className={classNames("num absolute -translate-x-1/2 text-[10.5px] text-ink-4")}
            style={{ left: `${position(tick)}%` }}
          >
            {pct(tick, 0)}
          </span>
        ))}
      </div>
      <p className="mt-2 text-[11.5px] leading-relaxed text-ink-4">
        Dot = test accuracy, bar = 95% Wilson interval
        {reference != null ? `, vertical rule = ${referenceLabel.toLowerCase()} (${pct(reference)})` : ""}. Intervals
        that overlap are not distinguishable on this sample alone.
      </p>
    </div>
  );
}
