import { day, int, num, pct } from "./format";
import type { Cell } from "./dashboard-types";

/**
 * Formatting rules for the raw preview tables (leakage verification, feature
 * preview). Each column gets the precision that makes it readable: prices to
 * two decimals, rates as percentages, volume as an integer.
 */

const DATE_COLUMNS = new Set(["Date", "Next_Date"]);
const INTEGER_COLUMNS = new Set(["Volume"]);
const PERCENT_COLUMNS: Record<string, number> = {
  Rolling_Volatility_20: 3,
  Return_5D: 3,
  Volume_Change: 1,
};
const DECIMALS: Record<string, number> = {
  RSI_14: 2,
  MACD: 2,
  MACD_Signal: 2,
  MACD_Hist: 2,
};

export function formatPreviewCell(column: string, value: Cell): string {
  if (value == null) return "—";
  if (DATE_COLUMNS.has(column)) return day(String(value));
  if (typeof value !== "number") return String(value);
  if (INTEGER_COLUMNS.has(column)) return int(value);
  if (column in PERCENT_COLUMNS) return pct(value, PERCENT_COLUMNS[column]);
  if (column in DECIMALS) return num(value, DECIMALS[column]);
  return num(value, 2);
}

/** Short header label for the wide preview tables. */
export function previewHeader(column: string): string {
  return column.replace(/_/g, " ");
}
