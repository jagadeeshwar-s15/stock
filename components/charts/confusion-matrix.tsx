import { sequentialInk, sequentialStep } from "@/lib/chart-theme";
import { int, pct } from "@/lib/format";
import type { Confusion } from "@/lib/dashboard-types";

/**
 * 2x2 confusion matrix. Cells are shaded on a single-hue sequential ramp by
 * the share of their actual class, and every count is printed, so the colour
 * only supports a value that is already readable.
 */
export function ConfusionMatrix({
  confusion,
  title,
  accent,
}: {
  confusion: Confusion;
  title?: string;
  accent?: string;
}) {
  const rows = [
    { label: "Actual DOWN", cells: [confusion.tn, confusion.fp], total: confusion.tn + confusion.fp },
    { label: "Actual UP", cells: [confusion.fn, confusion.tp], total: confusion.fn + confusion.tp },
  ];

  return (
    <figure className="m-0">
      {title ? (
        <figcaption className="mb-2 flex items-center gap-2 text-[12.5px] font-semibold text-ink">
          {accent ? (
            <span aria-hidden className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: accent }} />
          ) : null}
          {title}
        </figcaption>
      ) : null}
      <div className="grid grid-cols-[auto_1fr_1fr] gap-1.5">
        <span />
        <span className="pb-0.5 text-center text-[10.5px] font-semibold uppercase tracking-wide text-ink-3">
          Pred. DOWN
        </span>
        <span className="pb-0.5 text-center text-[10.5px] font-semibold uppercase tracking-wide text-ink-3">
          Pred. UP
        </span>

        {rows.map((row) => (
          <div key={row.label} className="contents">
            <span className="flex items-center pr-1 text-[10.5px] font-semibold uppercase tracking-wide text-ink-3">
              {row.label}
            </span>
            {row.cells.map((value, index) => {
              const share = row.total > 0 ? value / row.total : 0;
              return (
                <div
                  key={index}
                  className="num flex min-h-[62px] flex-col items-center justify-center rounded-lg px-2 py-2"
                  style={{ backgroundColor: sequentialStep(share), color: sequentialInk(share) }}
                  title={`${row.label}, ${index === 0 ? "predicted DOWN" : "predicted UP"}: ${int(value)} sessions (${pct(share, 1)} of the row)`}
                >
                  <span className="text-[17px] font-bold leading-none">{int(value)}</span>
                  <span className="mt-1 text-[10.5px] font-medium opacity-85">{pct(share, 1)} of row</span>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </figure>
  );
}
