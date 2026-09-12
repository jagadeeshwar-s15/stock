import type { ReactNode } from "react";

import { classNames } from "@/lib/format";

/** Monospace block for formulas and short code snippets. */
export function CodeBlock({
  children,
  tone = "light",
  className,
}: {
  children: ReactNode;
  tone?: "light" | "dark";
  className?: string;
}) {
  return (
    <pre
      className={classNames(
        "table-scroll rounded-xl px-3.5 py-3 font-mono text-[12px] leading-relaxed",
        tone === "dark" ? "bg-navy text-white/90" : "bg-subtle text-ink-2",
        className,
      )}
    >
      <code>{children}</code>
    </pre>
  );
}

export function InlineCode({ children }: { children: ReactNode }) {
  return <code className="rounded bg-subtle px-1.5 py-0.5 font-mono text-[11.5px] text-ink-2">{children}</code>;
}

/** A definition rendered like a formula: label above, expression below. */
export function Formula({ label, children }: { label?: string; children: ReactNode }) {
  return (
    <div className="rounded-xl border border-line bg-subtle px-3.5 py-3">
      {label ? <p className="label-caps mb-1.5">{label}</p> : null}
      <p className="font-mono text-[12.5px] leading-relaxed text-ink">{children}</p>
    </div>
  );
}
