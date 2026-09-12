import type { ReactNode } from "react";

import { classNames } from "@/lib/format";

/**
 * Stat tile: label, value, optional delta and hint. The value uses the font's
 * proportional figures (tabular-nums is reserved for table columns).
 */
export function Stat({
  label,
  value,
  delta,
  deltaTone = "neutral",
  hint,
  accent,
  className,
  children,
}: {
  label: string;
  value: ReactNode;
  delta?: ReactNode;
  deltaTone?: "up" | "down" | "neutral";
  hint?: ReactNode;
  accent?: string;
  className?: string;
  children?: ReactNode;
}) {
  return (
    <div className={classNames("card card-pad flex flex-col gap-1", className)}>
      <div className="flex items-center gap-2">
        {accent ? (
          <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: accent }} aria-hidden />
        ) : null}
        <span className="label-caps truncate">{label}</span>
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-[26px] font-bold leading-none tracking-tight text-ink sm:text-[28px]">{value}</span>
        {delta ? (
          <span
            className={classNames(
              "text-[12.5px] font-semibold",
              deltaTone === "up" && "text-up-ink",
              deltaTone === "down" && "text-down-ink",
              deltaTone === "neutral" && "text-ink-3",
            )}
          >
            {delta}
          </span>
        ) : null}
      </div>
      {hint ? <p className="text-[12px] leading-relaxed text-ink-3">{hint}</p> : null}
      {children}
    </div>
  );
}

/** Compact label/value row used inside metadata cards. */
export function KeyValue({
  items,
  columns = 1,
  className,
}: {
  items: { label: string; value: ReactNode; mono?: boolean }[];
  columns?: 1 | 2;
  className?: string;
}) {
  return (
    <dl
      className={classNames(
        "grid gap-x-6 gap-y-0",
        columns === 2 ? "sm:grid-cols-2" : "grid-cols-1",
        className,
      )}
    >
      {items.map((item) => (
        <div
          key={item.label}
          className="flex items-baseline justify-between gap-4 border-b border-line/70 py-2 last:border-b-0"
        >
          <dt className="shrink-0 text-[12.5px] text-ink-3">{item.label}</dt>
          <dd
            className={classNames(
              "num min-w-0 break-words text-right text-[13px] font-semibold text-ink",
              item.mono && "font-mono text-[11.5px] font-medium",
            )}
          >
            {item.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}
