import type { ReactNode } from "react";

import { IconArrowDown, IconArrowUp, IconCheck, IconCross } from "./icon";
import { classNames } from "@/lib/format";

type Tone = "neutral" | "accent" | "up" | "down" | "warn" | "ok";

const TONES: Record<Tone, string> = {
  neutral: "border-line bg-subtle text-ink-2",
  accent: "border-accent/20 bg-accent-soft text-accent",
  up: "border-up/20 bg-up-soft text-up-ink",
  down: "border-down/20 bg-down-soft text-down-ink",
  warn: "border-warn/20 bg-warn-soft text-warn",
  ok: "border-up/20 bg-up-soft text-up-ink",
};

export function Badge({
  children,
  tone = "neutral",
  className,
}: {
  children: ReactNode;
  tone?: Tone;
  className?: string;
}) {
  return (
    <span
      className={classNames(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11.5px] font-semibold",
        TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

/**
 * UP / DOWN badge. Direction is carried by the text and the arrow as well as
 * the colour, so it stays readable without colour vision.
 */
export function DirectionBadge({
  value,
  label,
  className,
}: {
  value: 0 | 1;
  label?: string;
  className?: string;
}) {
  const up = value === 1;
  return (
    <Badge tone={up ? "up" : "down"} className={className}>
      {up ? <IconArrowUp size={13} /> : <IconArrowDown size={13} />}
      {label ?? (up ? "UP (1)" : "DOWN (0)")}
    </Badge>
  );
}

export function PassBadge({ passed, className }: { passed: boolean; className?: string }) {
  return (
    <Badge tone={passed ? "ok" : "down"} className={className}>
      {passed ? <IconCheck size={13} /> : <IconCross size={13} />}
      {passed ? "Pass" : "Fail"}
    </Badge>
  );
}
