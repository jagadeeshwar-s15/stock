"use client";

import { useEffect } from "react";

import { IconAlert } from "@/components/ui/icon";

export default function Error({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error("Dashboard render failed:", error);
  }, [error]);

  return (
    <div className="card mx-auto max-w-xl px-5 py-9 text-center sm:px-8">
      <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-down-soft text-down">
        <IconAlert size={22} />
      </span>
      <h1 className="mt-4 text-[19px] font-bold tracking-tight text-ink">Something went wrong</h1>
      <p className="mx-auto mt-2 max-w-md text-[13.5px] leading-relaxed text-ink-2">
        This page could not be rendered. Nothing was changed in the pipeline output; you can try again, and if the
        problem persists re-run <code className="font-mono text-[12px]">python run_pipeline.py</code> in the{" "}
        <code className="font-mono text-[12px]">ml/</code> directory.
      </p>
      {error.digest ? (
        <p className="mt-3 font-mono text-[11.5px] text-ink-4">Error reference: {error.digest}</p>
      ) : null}
      <button type="button" onClick={() => retry()} className="btn btn-primary mt-5">
        Try again
      </button>
    </div>
  );
}
