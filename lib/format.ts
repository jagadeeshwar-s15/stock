/**
 * Display formatting helpers.
 *
 * Dates arrive as plain `YYYY-MM-DD` strings and are always formatted in UTC
 * with a fixed locale, so the server and the browser render the same text and
 * hydration never mismatches.
 */

const NUMBER = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2, minimumFractionDigits: 2 });
const INTEGER = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });
const COMPACT = new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 });
const DAY = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});
const MONTH = new Intl.DateTimeFormat("en-GB", { month: "short", year: "numeric", timeZone: "UTC" });
const TIME = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: "UTC",
});

export const NA = "n/a";

/** Percentage with a fixed number of decimals: 0.5563 -> "55.63%". */
export function pct(value: number | null | undefined, digits = 2): string {
  if (value == null || !Number.isFinite(value)) return NA;
  return `${(value * 100).toFixed(digits)}%`;
}

/** Signed difference in percentage points: 0.021 -> "+2.10 pp". */
export function pp(value: number | null | undefined, digits = 2): string {
  if (value == null || !Number.isFinite(value)) return NA;
  const points = value * 100;
  return `${points > 0 ? "+" : ""}${points.toFixed(digits)} pp`;
}

/** Plain signed number: 172.45 -> "+172.45". */
export function signed(value: number | null | undefined, digits = 2): string {
  if (value == null || !Number.isFinite(value)) return NA;
  return `${value > 0 ? "+" : ""}${value.toFixed(digits)}`;
}

export function num(value: number | null | undefined, digits?: number): string {
  if (value == null || !Number.isFinite(value)) return NA;
  if (digits === undefined) return NUMBER.format(value);
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  }).format(value);
}

export function int(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return NA;
  return INTEGER.format(value);
}

export function compact(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return NA;
  return COMPACT.format(value);
}

/** "2026-09-10" -> "10 Sep 2026". */
export function day(iso: string | null | undefined): string {
  if (!iso) return NA;
  const parsed = new Date(`${iso.slice(0, 10)}T00:00:00Z`);
  return Number.isNaN(parsed.getTime()) ? NA : DAY.format(parsed);
}

/** "2026-09-10" -> "Sep 2026". */
export function monthYear(iso: string | null | undefined): string {
  if (!iso) return NA;
  const parsed = new Date(`${iso.slice(0, 10)}T00:00:00Z`);
  return Number.isNaN(parsed.getTime()) ? NA : MONTH.format(parsed);
}

/** ISO timestamp -> "11 Sep 2026, 19:23 UTC". */
export function timestamp(iso: string | null | undefined): string {
  if (!iso) return NA;
  const parsed = new Date(iso);
  return Number.isNaN(parsed.getTime()) ? NA : `${TIME.format(parsed)} UTC`;
}

/** Label for a direction label value. */
export function direction(value: 0 | 1 | null | undefined): string {
  if (value == null) return NA;
  return value === 1 ? "UP" : "DOWN";
}

/** A p-value, with the conventional "< 0.001" floor. */
export function pValue(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return NA;
  return value < 0.001 ? "< 0.001" : value.toFixed(3);
}

/** Render a preview-table cell that may hold a number, a date or nothing. */
export function cell(value: string | number | null | undefined, digits = 2): string {
  if (value == null) return "—";
  if (typeof value === "number") return Number.isInteger(value) ? int(value) : num(value, digits);
  return value;
}

export function classNames(...values: (string | false | null | undefined)[]): string {
  return values.filter(Boolean).join(" ");
}

/**
 * Serializable number-format descriptor.
 *
 * Charts are Client Components, and React Server Components cannot pass
 * functions across that boundary, so pages describe the format instead of
 * handing over a formatter.
 */
export type ValueFormat =
  | { kind: "number"; digits?: number }
  | { kind: "integer" }
  | { kind: "percent"; digits?: number };

export function formatWith(format: ValueFormat, value: number): string {
  switch (format.kind) {
    case "integer":
      return int(value);
    case "percent":
      return pct(value, format.digits ?? 1);
    default:
      return num(value, format.digits);
  }
}
