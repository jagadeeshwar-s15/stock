/** Small scale/path helpers shared by the SVG charts (no dependencies). */

export type Domain = [number, number];

export function scaleLinear(domain: Domain, range: Domain): (value: number) => number {
  const [d0, d1] = domain;
  const [r0, r1] = range;
  const span = d1 - d0 || 1;
  return (value: number) => r0 + ((value - d0) / span) * (r1 - r0);
}

export function extent(values: number[]): Domain {
  let min = Number.POSITIVE_INFINITY;
  let max = Number.NEGATIVE_INFINITY;
  for (const value of values) {
    if (!Number.isFinite(value)) continue;
    if (value < min) min = value;
    if (value > max) max = value;
  }
  if (!Number.isFinite(min) || !Number.isFinite(max)) return [0, 1];
  return min === max ? [min - 1, max + 1] : [min, max];
}

/** Pad a domain by a fraction of its span. */
export function padDomain([min, max]: Domain, fraction = 0.08): Domain {
  const pad = (max - min) * fraction;
  return [min - pad, max + pad];
}

/** Ticks on 1-2-5 multiples covering [min, max]. */
export function niceTicks(min: number, max: number, count = 4): number[] {
  if (!Number.isFinite(min) || !Number.isFinite(max) || min === max) return [min];
  const rough = (max - min) / Math.max(count, 1);
  const magnitude = 10 ** Math.floor(Math.log10(rough));
  const residual = rough / magnitude;
  const step = (residual >= 5 ? 10 : residual >= 2 ? 5 : residual >= 1 ? 2 : 1) * magnitude;
  const ticks: number[] = [];
  for (let value = Math.ceil(min / step) * step; value <= max + step * 1e-6; value += step) {
    ticks.push(Number(value.toPrecision(12)));
  }
  return ticks;
}

export interface Point {
  x: number;
  y: number;
}

export function linePath(points: Point[]): string {
  return points.map((point, index) => `${index === 0 ? "M" : "L"}${point.x.toFixed(2)} ${point.y.toFixed(2)}`).join(" ");
}

export function areaPath(points: Point[], baseline: number): string {
  if (points.length === 0) return "";
  const first = points[0];
  const last = points[points.length - 1];
  return `${linePath(points)} L${last.x.toFixed(2)} ${baseline.toFixed(2)} L${first.x.toFixed(2)} ${baseline.toFixed(2)} Z`;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/** Index of the position closest to `x`, for crosshair hit testing. */
export function nearestIndex(count: number, x: number, plotLeft: number, plotWidth: number): number {
  if (count <= 1) return 0;
  const ratio = clamp((x - plotLeft) / (plotWidth || 1), 0, 1);
  return Math.round(ratio * (count - 1));
}

/** Evenly spaced label positions (indices) for a categorical/time axis. */
export function tickIndices(count: number, wanted: number): number[] {
  if (count <= 0) return [];
  const step = Math.max(1, Math.ceil(count / Math.max(wanted, 1)));
  const indices: number[] = [];
  for (let index = 0; index < count; index += step) indices.push(index);
  if (indices[indices.length - 1] !== count - 1) indices.push(count - 1);
  return indices;
}
