import { DIRECTION } from "@/lib/chart-theme";
import { num } from "@/lib/format";

/**
 * Diverging bars for logistic-regression coefficients on standardised
 * features: right of the centre line raises the predicted probability of UP,
 * left lowers it. Values are printed, so the colour is not the only signal.
 */
export function CoefficientBars({
  values,
  limit,
}: {
  values: { feature: string; coef: number }[];
  limit?: number;
}) {
  const shown = limit ? [...values].sort((a, b) => Math.abs(b.coef) - Math.abs(a.coef)).slice(0, limit) : values;
  const ordered = [...shown].sort((a, b) => b.coef - a.coef);
  const max = Math.max(...ordered.map((item) => Math.abs(item.coef)), 1e-6);

  return (
    <div>
      <ul className="flex flex-col gap-1.5">
        {ordered.map((item) => {
          const share = (Math.abs(item.coef) / max) * 50;
          const positive = item.coef >= 0;
          return (
            <li key={item.feature} className="grid grid-cols-[minmax(6.5rem,auto)_1fr_auto] items-center gap-2">
              <span className="truncate font-mono text-[11px] text-ink-2" title={item.feature}>
                {item.feature}
              </span>
              <span className="relative block h-4">
                <span aria-hidden className="absolute inset-y-0 left-1/2 w-px bg-line-strong" />
                <span
                  className="absolute top-1/2 h-2.5 -translate-y-1/2 rounded-[3px]"
                  style={{
                    backgroundColor: positive ? DIRECTION.up : DIRECTION.down,
                    left: positive ? "50%" : `${50 - share}%`,
                    width: `${Math.max(share, 0.4)}%`,
                  }}
                />
              </span>
              <span className="num w-16 text-right text-[11.5px] font-semibold text-ink">
                {item.coef >= 0 ? "+" : ""}
                {num(item.coef, 4)}
              </span>
            </li>
          );
        })}
      </ul>
      <div className="mt-2 flex justify-between text-[10.5px] text-ink-4">
        <span>← lowers P(UP)</span>
        <span>raises P(UP) →</span>
      </div>
    </div>
  );
}
