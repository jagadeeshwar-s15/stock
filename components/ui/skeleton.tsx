import { classNames } from "@/lib/format";

export function SkeletonLine({ className }: { className?: string }) {
  return <div className={classNames("skeleton h-3.5", className)} />;
}

export function SkeletonStat() {
  return (
    <div className="card card-pad flex flex-col gap-3">
      <SkeletonLine className="w-24" />
      <SkeletonLine className="h-7 w-32" />
      <SkeletonLine className="w-40" />
    </div>
  );
}

export function SkeletonCard({ lines = 4, className }: { lines?: number; className?: string }) {
  return (
    <div className={classNames("card card-pad flex flex-col gap-3", className)}>
      <SkeletonLine className="w-40" />
      {Array.from({ length: lines }).map((_, index) => (
        <SkeletonLine key={index} className={index % 3 === 0 ? "w-full" : index % 3 === 1 ? "w-11/12" : "w-9/12"} />
      ))}
    </div>
  );
}

export function SkeletonChart({ className }: { className?: string }) {
  return (
    <div className={classNames("card card-pad", className)}>
      <SkeletonLine className="w-48" />
      <div className="skeleton mt-4 h-[220px] w-full rounded-xl" />
    </div>
  );
}

/** Route-level fallback used by every `loading.tsx`. */
export function PageSkeleton() {
  return (
    <div className="flex flex-col gap-4" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading pipeline results…</span>
      <div className="flex flex-col gap-2">
        <SkeletonLine className="h-6 w-64" />
        <SkeletonLine className="w-96 max-w-full" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <SkeletonStat key={index} />
        ))}
      </div>
      <SkeletonChart />
      <div className="grid gap-4 lg:grid-cols-2">
        <SkeletonCard lines={6} />
        <SkeletonCard lines={6} />
      </div>
    </div>
  );
}
