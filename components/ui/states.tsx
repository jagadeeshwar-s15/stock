import type { ReactNode } from "react";

import { IconAlert, IconInfo, IconTable } from "./icon";
import { classNames } from "@/lib/format";

/** Shown when the pipeline has not produced `results/dashboard.json` yet. */
export function EmptyState({ path }: { path: string }) {
  return (
    <div className="card mx-auto max-w-2xl px-5 py-8 text-center sm:px-8 sm:py-10">
      <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-accent-soft text-accent">
        <IconTable size={22} />
      </span>
      <h1 className="mt-4 text-[19px] font-bold tracking-tight text-ink">No pipeline results yet</h1>
      <p className="mx-auto mt-2 max-w-lg text-[13.5px] leading-relaxed text-ink-2">
        This dashboard renders the output of the machine-learning pipeline and never invents numbers. Run the
        notebook once to create <code className="rounded bg-subtle px-1.5 py-0.5 font-mono text-[12px]">{path}</code>,
        then reload this page.
      </p>
      <pre className="mt-5 overflow-x-auto rounded-xl bg-navy px-4 py-3.5 text-left font-mono text-[12px] leading-relaxed text-white/90">
        <code>{`cd ml
python -m venv .venv
.venv\\Scripts\\activate      # macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
python run_pipeline.py`}</code>
      </pre>
      <p className="mt-4 text-[12px] text-ink-3">
        The first run downloads the NIFTY 50 snapshot if it is missing, executes the notebook and writes every
        artifact into <code className="font-mono">ml/results/</code>.
      </p>
    </div>
  );
}

/** Shown when the file exists but cannot be used. */
export function ErrorState({ path, reason }: { path: string; reason: string }) {
  return (
    <div className="card mx-auto max-w-2xl px-5 py-8 text-center sm:px-8 sm:py-10">
      <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-down-soft text-down">
        <IconAlert size={22} />
      </span>
      <h1 className="mt-4 text-[19px] font-bold tracking-tight text-ink">Pipeline output could not be read</h1>
      <p className="mx-auto mt-2 max-w-lg text-[13.5px] leading-relaxed text-ink-2">
        <code className="rounded bg-subtle px-1.5 py-0.5 font-mono text-[12px]">{path}</code> exists but does not
        match what this dashboard expects, so nothing is displayed rather than showing stale or partial numbers.
      </p>
      <p className="mx-auto mt-3 max-w-lg rounded-xl bg-down-soft px-4 py-3 text-left font-mono text-[12px] leading-relaxed text-down-ink">
        {reason}
      </p>
      <p className="mt-4 text-[12px] text-ink-3">
        Re-run <code className="font-mono">python run_pipeline.py</code> in the <code className="font-mono">ml/</code>{" "}
        directory to regenerate it.
      </p>
    </div>
  );
}

type NoticeTone = "info" | "warn" | "accent";

const NOTICE_TONES: Record<NoticeTone, string> = {
  info: "border-line bg-subtle text-ink-2",
  warn: "border-warn/25 bg-warn-soft text-warn",
  accent: "border-accent/20 bg-accent-soft text-ink-2",
};

/** Inline explanatory note (methodology caveats, disclaimers). */
export function Notice({
  children,
  tone = "info",
  title,
  className,
}: {
  children: ReactNode;
  tone?: NoticeTone;
  title?: string;
  className?: string;
}) {
  return (
    <div className={classNames("flex gap-3 rounded-xl border px-3.5 py-3", NOTICE_TONES[tone], className)}>
      <span className="mt-0.5 shrink-0">
        {tone === "warn" ? <IconAlert size={16} /> : <IconInfo size={16} />}
      </span>
      <div className="text-[12.5px] leading-relaxed">
        {title ? <p className="font-semibold text-ink">{title}</p> : null}
        <div className={title ? "mt-0.5" : undefined}>{children}</div>
      </div>
    </div>
  );
}
