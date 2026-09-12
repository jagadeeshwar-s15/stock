import type { ReactNode } from "react";

import { classNames } from "@/lib/format";

/** Legend entry: a mark in the series colour beside text in an ink colour. */
export function Legend({
  items,
  className,
}: {
  items: { label: string; color: string; shape?: "line" | "dot" | "rect"; note?: string }[];
  className?: string;
}) {
  return (
    <ul className={classNames("flex flex-wrap items-center gap-x-4 gap-y-1.5", className)}>
      {items.map((item) => (
        <li key={item.label} className="flex items-center gap-1.5 text-[11.5px] text-ink-2">
          <span aria-hidden className="flex h-3 w-3 items-center justify-center">
            {item.shape === "dot" ? (
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
            ) : item.shape === "rect" ? (
              <span className="h-2.5 w-2.5 rounded-[3px]" style={{ backgroundColor: item.color }} />
            ) : (
              <span className="h-[2px] w-3 rounded-full" style={{ backgroundColor: item.color }} />
            )}
          </span>
          <span className="font-medium">{item.label}</span>
          {item.note ? <span className="text-ink-4">{item.note}</span> : null}
        </li>
      ))}
    </ul>
  );
}

/** Floating readout used by the interactive charts. */
export function ChartTooltip({
  x,
  y,
  width,
  children,
}: {
  x: number;
  y: number;
  width: number;
  children: ReactNode;
}) {
  const flip = x > width * 0.6;
  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none absolute z-20 min-w-[9rem] rounded-xl border border-line bg-surface px-3 py-2 text-[11.5px] shadow-[var(--shadow-pop)]"
      style={{
        left: flip ? undefined : x + 12,
        right: flip ? width - x + 12 : undefined,
        top: Math.max(4, y - 8),
      }}
    >
      {children}
    </div>
  );
}

export function TooltipRow({
  label,
  value,
  color,
}: {
  label: string;
  value: ReactNode;
  color?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="flex items-center gap-1.5 text-ink-3">
        {color ? (
          <span aria-hidden className="h-[2px] w-2.5 rounded-full" style={{ backgroundColor: color }} />
        ) : null}
        {label}
      </span>
      <span className="num font-semibold text-ink">{value}</span>
    </div>
  );
}

/** Wrapper giving a chart its heading, legend slot and optional footnote. */
export function ChartFrame({
  title,
  subtitle,
  legend,
  footnote,
  children,
  className,
  action,
}: {
  title?: ReactNode;
  subtitle?: ReactNode;
  legend?: ReactNode;
  footnote?: ReactNode;
  children: ReactNode;
  className?: string;
  action?: ReactNode;
}) {
  return (
    <div className={classNames("flex flex-col gap-3", className)}>
      {title || legend || action ? (
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            {title ? <h3 className="card-title">{title}</h3> : null}
            {subtitle ? <p className="card-subtitle">{subtitle}</p> : null}
          </div>
          <div className="flex items-center gap-3">
            {legend}
            {action}
          </div>
        </div>
      ) : null}
      {children}
      {footnote ? <p className="text-[11.5px] leading-relaxed text-ink-4">{footnote}</p> : null}
    </div>
  );
}
