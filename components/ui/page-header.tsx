import type { ReactNode } from "react";

import { classNames } from "@/lib/format";

/** Title block at the top of every page, with optional meta chips and actions. */
export function PageHeader({
  eyebrow,
  title,
  description,
  meta,
  actions,
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: ReactNode;
  meta?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <header className={classNames("mb-5 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between", className)}>
      <div className="min-w-0">
        {eyebrow ? <p className="label-caps">{eyebrow}</p> : null}
        <h1 className="mt-1 text-[22px] font-bold tracking-tight text-ink sm:text-[26px]">{title}</h1>
        {description ? (
          <p className="mt-1.5 max-w-3xl text-[13.5px] leading-relaxed text-ink-2">{description}</p>
        ) : null}
        {meta ? <div className="mt-3 flex flex-wrap items-center gap-2">{meta}</div> : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  );
}
