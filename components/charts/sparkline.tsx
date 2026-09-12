import { areaPath, extent, linePath, padDomain, scaleLinear } from "@/lib/chart-math";

/**
 * Tiny trend line for stat tiles. It carries no text, so scaling it with a
 * viewBox is safe, and it is decorative: the value beside it carries the data.
 */
export function Sparkline({
  values,
  color = "#4f46e5",
  height = 36,
  width = 120,
  fill = true,
  className,
}: {
  values: (number | null)[];
  color?: string;
  height?: number;
  width?: number;
  fill?: boolean;
  className?: string;
}) {
  const clean = values.filter((value): value is number => value != null && Number.isFinite(value));
  if (clean.length < 2) return null;

  const domain = padDomain(extent(clean), 0.12);
  const x = scaleLinear([0, clean.length - 1], [1, width - 1]);
  const y = scaleLinear(domain, [height - 2, 2]);
  const points = clean.map((value, index) => ({ x: x(index), y: y(value) }));
  const gradientId = `spark-${color.replace("#", "")}-${clean.length}`;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className={className ?? "h-9 w-full"}
      preserveAspectRatio="none"
      aria-hidden
      focusable="false"
    >
      {fill ? (
        <>
          <defs>
            <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.22} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <path d={areaPath(points, height)} fill={`url(#${gradientId})`} />
        </>
      ) : null}
      <path d={linePath(points)} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
