/**
 * Chart colour roles, mirroring the CSS tokens in `app/globals.css` and the
 * matplotlib palette in `ml/src/plots.py` so the figures in the notebook and
 * the charts in the dashboard agree.
 *
 * The two model colours (orange / indigo) were validated to stay separable
 * under protanopia and deuteranopia. UP/DOWN green and red carry domain
 * meaning and are always accompanied by position, a glyph or a text label.
 */

export const SERIES = {
  persistence: "#94a3b8",
  majority: "#64748b",
  raw: "#eb6834",
  engineered: "#4f46e5",
} as const;

export const DIRECTION = {
  up: "#16a34a",
  down: "#dc2626",
  upInk: "#15803d",
  downInk: "#b91c1c",
  upSoft: "#ecfdf5",
  downSoft: "#fef2f2",
} as const;

export const CHART = {
  surface: "#ffffff",
  grid: "#e6e9f0",
  axis: "#94a3b8",
  ink: "#0f172a",
  ink2: "#475569",
  muted: "#64748b",
  accent: "#4f46e5",
  accentSoft: "#eef2ff",
} as const;

/** Single-hue sequential ramp (light to dark) for the confusion-matrix cells. */
export const SEQUENTIAL_BLUE = [
  "#f5f7ff",
  "#e0e7ff",
  "#c7d2fe",
  "#a5b4fc",
  "#818cf8",
  "#6366f1",
  "#4f46e5",
] as const;

export function sequentialStep(share: number): string {
  const clamped = Math.min(Math.max(share, 0), 1);
  const index = Math.round(clamped * (SEQUENTIAL_BLUE.length - 1));
  return SEQUENTIAL_BLUE[index];
}

/** Ink colour that stays readable on a given sequential step. */
export function sequentialInk(share: number): string {
  return share > 0.55 ? "#ffffff" : CHART.ink;
}

export type ApproachColorKey = keyof typeof SERIES;

export function approachColor(key: string): string {
  return SERIES[key as ApproachColorKey] ?? CHART.muted;
}
