import { IconCheck, IconCross } from "./icon";
import { classNames } from "@/lib/format";
import type { LeakageCheck } from "@/lib/dashboard-types";

/** One programmatic check: what was verified, and the evidence behind it. */
export function LeakageCheckList({ checks, dense }: { checks: LeakageCheck[]; dense?: boolean }) {
  return (
    <ul className="flex flex-col divide-y divide-line">
      {checks.map((check) => (
        <li key={check.id} className={classNames("flex gap-3 py-3 first:pt-0 last:pb-0")}>
          <span
            className={classNames(
              "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full",
              check.passed ? "bg-up-soft text-up-ink" : "bg-down-soft text-down-ink",
            )}
            aria-hidden
          >
            {check.passed ? <IconCheck size={14} /> : <IconCross size={14} />}
          </span>
          <div className="min-w-0">
            <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] font-semibold text-ink">
              {check.name}
              <span className="rounded-full bg-subtle px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-ink-3">
                {check.ref}
              </span>
              <span className="text-[10.5px] font-medium uppercase tracking-wide text-ink-4">{check.stage}</span>
              <span className="sr-only">{check.passed ? "Passed" : "Failed"}</span>
            </p>
            {dense ? null : <p className="mt-1 text-[12.5px] leading-relaxed text-ink-2">{check.detail}</p>}
          </div>
        </li>
      ))}
    </ul>
  );
}
