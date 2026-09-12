import type { Metadata } from "next";

import { ArtifactButton } from "@/components/ui/artifact-links";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody, CardHeader, SectionHeading } from "@/components/ui/card";
import { CodeBlock, InlineCode } from "@/components/ui/code";
import { PageHeader } from "@/components/ui/page-header";
import { KeyValue } from "@/components/ui/stat";
import { EmptyState, ErrorState, Notice } from "@/components/ui/states";
import { getDashboard } from "@/lib/dashboard";
import { day, int, timestamp } from "@/lib/format";
import { checksPassed } from "@/lib/selectors";

export const metadata: Metadata = {
  title: "Methodology",
  description: "How the pipeline works, how to reproduce it, and what the project does not claim.",
};

const STEPS = [
  {
    title: "Load and verify the snapshot",
    detail:
      "The committed CSV is read and its SHA-256 compared with the recorded metadata, so an edited data file raises an error instead of silently changing results.",
    module: "src/data_loader.py",
  },
  {
    title: "Clean conservatively",
    detail:
      "Parse dates, coerce to numeric, sort, drop duplicates and incomplete sessions, flag OHLC inconsistencies, and record zero volume as unavailable. No price is ever edited and nothing is imputed.",
    module: "src/data_loader.py",
  },
  {
    title: "Build the label",
    detail:
      "Target_t = 1 if Close_(t+1) > Close_t. This is the only forward-looking code in the project, and the final unlabelled session is excluded.",
    module: "src/target.py",
  },
  {
    title: "Engineer causal features",
    detail:
      "Trailing windows, forward-recursive exponential averages and positive lags only. A truncation test recomputes every feature on histories cut at date t to prove no future value is used.",
    module: "src/features.py",
  },
  {
    title: "Split chronologically with an embargo",
    detail:
      "The last 20% of usable sessions form the test window; one session is purged at the boundary so no training label depends on a test-period close.",
    module: "src/split.py",
  },
  {
    title: "Select the model inside the training window",
    detail:
      "TimeSeriesSplit folds with a one-session gap tune C for both feature sets. The scaler lives inside the pipeline, so it is re-fitted per fold and never sees validation or test rows.",
    module: "src/models.py",
  },
  {
    title: "Evaluate once",
    detail:
      "All four approaches are scored on the same untouched test window, with Wilson intervals and exact McNemar tests to separate real differences from noise.",
    module: "src/evaluation.py",
  },
  {
    title: "Audit, export, render",
    detail:
      "Every leakage and validity check runs again, the CSV tables and figures are written, and the dashboard payload is serialised for this web app.",
    module: "src/leakage.py, src/dashboard.py",
  },
];

export default async function MethodologyPage() {
  const state = await getDashboard();
  if (state.status === "missing") return <EmptyState path={state.path} />;
  if (state.status === "invalid") return <ErrorState path={state.path} reason={state.reason} />;

  const data = state.data;
  const checks = checksPassed(data);

  return (
    <>
      <PageHeader
        eyebrow="Reference"
        title="Methodology"
        description="This dashboard is a rendering layer. All analysis happens in the notebook, which writes a single JSON file that these pages display without recomputing anything."
        meta={
          <>
            <Badge tone="neutral">Schema v{data.schemaVersion}</Badge>
            <Badge tone="neutral">Pipeline run {timestamp(data.generatedAt)}</Badge>
            <Badge tone={checks.passed === checks.total ? "ok" : "down"}>
              {checks.passed}/{checks.total} checks passed
            </Badge>
          </>
        }
        actions={<ArtifactButton file="stock_price_movement_predictor.ipynb" label="Download notebook" />}
      />

      <SectionHeading title="Pipeline" description="What runs, in order, every time the notebook is executed." />
      <Card>
        <CardBody>
          <ol className="flex flex-col divide-y divide-line">
            {STEPS.map((step, index) => (
              <li key={step.title} className="flex gap-3 py-3 first:pt-0 last:pb-0">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent-soft text-[12px] font-bold text-accent">
                  {index + 1}
                </span>
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold text-ink">{step.title}</p>
                  <p className="mt-0.5 text-[12.5px] leading-relaxed text-ink-2">{step.detail}</p>
                  <p className="mt-1 font-mono text-[11px] text-ink-4">{step.module}</p>
                </div>
              </li>
            ))}
          </ol>
        </CardBody>
      </Card>

      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader title="Reproduce it locally" subtitle="From a clean checkout, in two steps." />
          <CardBody className="flex flex-col gap-3 pt-1">
            <div>
              <p className="label-caps mb-1.5">1 · run the analysis</p>
              <CodeBlock tone="dark">{`cd ml
python -m venv .venv
.venv\\Scripts\\activate      # macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
python run_pipeline.py       # add --refresh to re-download the window`}</CodeBlock>
            </div>
            <div>
              <p className="label-caps mb-1.5">2 · run this dashboard</p>
              <CodeBlock tone="dark">{`pnpm install
pnpm dev                     # http://localhost:3000`}</CodeBlock>
            </div>
            <p className="text-[12.5px] leading-relaxed text-ink-2">
              The dashboard reads <InlineCode>ml/results/dashboard.json</InlineCode> at request time, so re-running the
              pipeline shows up on the next page load without a rebuild. Set{" "}
              <InlineCode>DASHBOARD_DATA_PATH</InlineCode> to read the file from somewhere else.
            </p>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Environment and provenance" subtitle="The exact versions that produced these numbers." />
          <CardBody className="pt-1">
            <KeyValue
              items={[
                ...Object.entries(data.environment).map(([name, version]) => ({ label: name, value: version })),
                { label: "Dataset", value: `${data.dataset.name} (${data.dataset.ticker})` },
                {
                  label: "Window",
                  value: `${day(data.dataset.firstDate)} → ${day(data.dataset.lastDate)} · ${int(data.dataset.cleanRows)} sessions`,
                },
                { label: "Retrieved", value: timestamp(data.dataset.retrievedAtUtc) },
                { label: "Snapshot SHA-256", value: data.dataset.sha256?.slice(0, 24) ?? "—", mono: true },
              ]}
            />
          </CardBody>
        </Card>
      </div>

      <SectionHeading className="mt-6" title="What this project does not claim" />
      <Card>
        <CardBody className="flex flex-col gap-3">
          <Notice tone="warn" title="Not investment advice">
            This is a student-style research project about time-series methodology. Nothing here is a recommendation to
            buy or sell anything, no trading strategy was implemented or evaluated, and classification accuracy is not
            profitability: costs, slippage and position sizing are not modelled.
          </Notice>
          <ul className="flex list-disc flex-col gap-2 pl-5 text-[12.5px] leading-relaxed text-ink-2">
            {data.limitations.map((limitation) => (
              <li key={limitation}>{limitation}</li>
            ))}
          </ul>
        </CardBody>
      </Card>
    </>
  );
}
