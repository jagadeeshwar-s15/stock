import { DIRECTION } from "@/lib/chart-theme";
import { int, pct } from "@/lib/format";
import type { ClassBalanceSplit } from "@/lib/dashboard-types";

/**
 * UP / DOWN share per partition as 100% stacked bars. Percentages are printed
 * on the bars, so the split is readable without relying on colour, and a 50%
 * marker shows how far each partition sits from an even split.
 */
export function ClassBalanceBars({ splits }: { splits: ClassBalanceSplit[] }) {
  return (
    <div className="flex flex-col gap-4">
      {splits.map((split) => (
        <div key={split.key}>
          <div className="mb-1.5 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
            <span className="text-[12.5px] font-semibold text-ink">{split.label}</span>
            <span className="num text-[11.5px] text-ink-3">
              {int(split.total)} sessions · {split.assessment}
            </span>
          </div>
          <div className="relative flex h-8 overflow-hidden rounded-lg" role="img"
            aria-label={`${split.label}: ${pct(split.upPct)} UP, ${pct(split.downPct)} DOWN, ${int(split.total)} sessions`}>
            <div
              className="flex items-center justify-center text-[11px] font-semibold text-white"
              style={{ width: `${split.upPct * 100}%`, backgroundColor: DIRECTION.up }}
            >
              {split.upPct > 0.16 ? `▲ UP ${pct(split.upPct, 1)}` : null}
            </div>
            <div
              className="flex items-center justify-center text-[11px] font-semibold text-white"
              style={{ width: `${split.downPct * 100}%`, backgroundColor: DIRECTION.down }}
            >
              {split.downPct > 0.16 ? `▼ DOWN ${pct(split.downPct, 1)}` : null}
            </div>
            <div aria-hidden className="absolute inset-y-0 left-1/2 w-px bg-white/70" />
          </div>
          <div className="num mt-1 flex justify-between text-[11px] text-ink-4">
            <span>{int(split.up)} UP</span>
            <span className="text-ink-4">50%</span>
            <span>{int(split.down)} DOWN</span>
          </div>
        </div>
      ))}
    </div>
  );
}
