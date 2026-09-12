"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Measures the container so charts can be drawn at 1:1 pixel scale instead of
 * being scaled by a viewBox, which would shrink axis labels on phones.
 *
 * The server render uses `fallback`, then the measured width takes over after
 * mount; the container's height is fixed, so nothing jumps.
 */
export function useChartWidth(fallback = 880) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [width, setWidth] = useState(fallback);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const apply = (value: number) => {
      const next = Math.max(240, Math.round(value));
      setWidth((current) => (Math.abs(current - next) > 1 ? next : current));
    };

    apply(element.getBoundingClientRect().width);
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) apply(entry.contentRect.width);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return { ref, width };
}
