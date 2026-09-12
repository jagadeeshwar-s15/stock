import type { Metadata } from "next";

import { AccuracyDots } from "@/components/charts/accuracy-dots";
import { ConfusionMatrix } from "@/components/charts/confusion-matrix";
import { CvCurve } from "@/components/charts/cv-curve";
import { SplitTimeline } from "@/components/charts/split-timeline";
import { ArtifactButton } from "@/components/ui/artifact-links";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody, CardHeader, SectionHeading } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { KeyValue, Stat } from "@/components/ui/stat";
import { EmptyState, ErrorState, Notice } from "@/components/ui/states";
import { DataTable, ScrollHint, type Column } from "@/components/ui/table";
import { Tabs } from "@/components/ui/tabs";
import { SERIES, approachColor } from "@/lib/chart-theme";
import { getDashboard } from "@/lib/dashboard";
import type { Approach, ClassificationReport, CvFold, CvGridResult, SignificanceTest } from "@/lib/dashboard-types";
import { day, int, num, pValue, pct } from "@/lib/format";
import { approach, classificationReport } from "@/lib/selectors";

export const metadata: Metadata = {
  title: "Model Evaluation",
  description: "Four-way comparison, confusion matrices, classification reports and the forward-chaining validation.",
};

export default async function EvaluationPage() {
  const state = await getDashboard();
  if (state.status === "missing") return <EmptyState path={state.path} />;
  if (state.status === "invalid") return <ErrorState path={state.path} reason={state.reason} />;

  const data = state.data;
  const { results, cv, split, model } = data;
  const majority = approach(data, "majority");

  const comparisonColumns: Column<Approach>[] = [
    {
      key: "label",
      header: "Approach",
      sticky: true,
      render: (row) => (
        <span className="flex items-center gap-2">
          <span aria-hidden className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: approachColor(row.key) }} />
          <span className="font-semibold text-ink">{row.label}</span>
          <span className="rounded-full bg-subtle px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-ink-3">
            {row.kind}
          </span>
        </span>
      ),
    },
    { key: "accuracy", header: "Accuracy", align: "right", render: (row) => <strong>{pct(row.accuracy)}</strong> },
    { key: "precision", header: "Precision", align: "right", render: (row) => pct(row.precision) },
    { key: "recall", header: "Recall", align: "right", render: (row) => pct(row.recall) },
    { key: "f1", header: "F1", align: "right", render: (row) => num(row.f1, 3) },
    { key: "balanced", header: "Balanced acc.", align: "right", render: (row) => pct(row.balancedAccuracy) },
    { key: "auc", header: "ROC-AUC", align: "right", render: (row) => (row.rocAuc == null ? "n/a" : num(row.rocAuc, 3)) },
    { key: "up", header: "Predicted UP", align: "right", render: (row) => pct(row.predictedUpRate, 1) },
    {
      key: "ci",
      header: "95% interval",
      align: "right",
      render: (row) => `${pct(row.accuracyCiLow, 1)} – ${pct(row.accuracyCiHigh, 1)}`,
    },
  ];

  const significanceColumns: Column<SignificanceTest>[] = [
    { key: "comparison", header: "Comparison (A vs B)", sticky: true },
    { key: "aOnlyCorrect", header: "A right, B wrong", align: "right", render: (row) => int(row.aOnlyCorrect) },
    { key: "bOnlyCorrect", header: "A wrong, B right", align: "right", render: (row) => int(row.bOnlyCorrect) },
    { key: "discordant", header: "Discordant days", align: "right", render: (row) => int(row.discordant) },
    {
      key: "pValue",
      header: "Exact McNemar p",
      align: "right",
      render: (row) => (
        <span className={row.pValue < 0.05 ? "font-semibold text-ink" : "text-ink-3"}>{pValue(row.pValue)}</span>
      ),
    },
  ];

  const foldColumns: Column<CvFold>[] = [
    { key: "fold", header: "Fold", sticky: true, render: (row) => `#${row.fold}` },
    { key: "fit", header: "Fits on", render: (row) => `${day(row.fitStart)} → ${day(row.fitEnd)}` },
    { key: "fitRows", header: "Rows", align: "right", render: (row) => int(row.fitRows) },
    {
      key: "validation",
      header: "Validates on",
      render: (row) => `${day(row.validationStart)} → ${day(row.validationEnd)}`,
    },
    { key: "validationRows", header: "Rows", align: "right", render: (row) => int(row.validationRows) },
  ];

  const gridColumns = (bestC: number): Column<CvGridResult>[] => [
    {
      key: "C",
      header: "C",
      sticky: true,
      render: (row) => (
        <span className={row.C === bestC ? "font-semibold text-accent" : undefined}>
          {row.C}
          {row.C === bestC ? " ← selected" : ""}
        </span>
      ),
    },
    {
      key: "mean",
      header: "Mean validation accuracy",
      align: "right",
      render: (row) => pct(row.meanValidationAccuracy),
    },
    { key: "std", header: "± s.d.", align: "right", render: (row) => pct(row.stdValidationAccuracy) },
    { key: "train", header: "Mean train accuracy", align: "right", render: (row) => pct(row.meanTrainAccuracy) },
    { key: "rank", header: "Rank", align: "right", render: (row) => int(row.rank) },
  ];

  const reportTable = (report: ClassificationReport | undefined) =>
    report ? (
      <DataTable
        columns={[
          { key: "label", header: "Class", sticky: true },
          {
            key: "precision",
            header: "Precision",
            align: "right",
            render: (row) => (row.precision == null ? "—" : num(row.precision, 3)),
          },
          {
            key: "recall",
            header: "Recall",
            align: "right",
            render: (row) => (row.recall == null ? "—" : num(row.recall, 3)),
          },
          { key: "f1", header: "F1", align: "right", render: (row) => (row.f1 == null ? "—" : num(row.f1, 3)) },
          { key: "support", header: "Support", align: "right", render: (row) => int(row.support) },
        ]}
        rows={report.rows}
        rowKey={(row) => row.label}
        caption={`Classification report for ${report.label}`}
      />
    ) : null;

  return (
    <>
      <PageHeader
        eyebrow="Step 3 · evaluation"
        title="Model Evaluation"
        description={`All four approaches scored once on the same untouched window of ${int(split.test.rows)} sessions, ${day(split.test.start)} to ${day(split.test.end)}. Positive class: UP.`}
        meta={
          <>
            <Badge tone="neutral">{model.pipeline}</Badge>
            <Badge tone="neutral">{cv.method}</Badge>
          </>
        }
        actions={<ArtifactButton file="four_way_comparison.csv" label="Comparison CSV" />}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {results.approaches.map((item) => (
          <Stat
            key={item.key}
            label={item.label}
            value={pct(item.accuracy)}
            accent={approachColor(item.key)}
            hint={`${item.kind === "baseline" ? "Naive baseline" : "Logistic regression"} · F1 ${num(item.f1, 3)} · balanced ${pct(item.balancedAccuracy, 1)}`}
          />
        ))}
      </div>

      <Card className="mt-4">
        <CardBody>
          <Tabs
            label="Evaluation views"
            items={[
              {
                id: "comparison",
                label: "Four-way comparison",
                content: (
                  <div className="flex flex-col gap-5">
                    <ScrollHint />
                    <DataTable
                      columns={comparisonColumns}
                      rows={results.approaches}
                      rowKey={(row) => row.key}
                      caption="Four-way comparison on the test window"
                      footnote="Precision, recall and F1 describe the UP class. A model that predicts UP for every session reaches 100% recall by construction, which is why accuracy and balanced accuracy matter more here."
                    />
                    <AccuracyDots approaches={results.approaches} reference={majority.accuracy} />
                  </div>
                ),
              },
              {
                id: "confusion",
                label: "Confusion matrices",
                content: (
                  <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
                    {results.approaches.map((item) => (
                      <ConfusionMatrix
                        key={item.key}
                        confusion={item.confusion}
                        title={item.label}
                        accent={approachColor(item.key)}
                      />
                    ))}
                  </div>
                ),
              },
              {
                id: "reports",
                label: "Classification reports",
                content: (
                  <div className="grid gap-5 xl:grid-cols-2">
                    <div>
                      <h3 className="card-title mb-2">Raw OHLCV</h3>
                      {reportTable(classificationReport(data, "raw"))}
                    </div>
                    <div>
                      <h3 className="card-title mb-2">Engineered Features</h3>
                      {reportTable(classificationReport(data, "engineered"))}
                    </div>
                  </div>
                ),
              },
              {
                id: "significance",
                label: "Significance",
                content: (
                  <div className="flex flex-col gap-3">
                    <DataTable
                      columns={significanceColumns}
                      rows={results.significance}
                      rowKey={(row) => row.comparison}
                      caption="Exact McNemar tests on paired predictions"
                    />
                    <Notice>
                      McNemar compares two approaches on the <em>same</em> sessions and only counts the days where they
                      disagree. Zero discordant days means two approaches produced identical predictions.
                    </Notice>
                  </div>
                ),
              },
            ]}
          />
        </CardBody>
      </Card>

      <SectionHeading
        className="mt-6"
        title="Validation and hyperparameter selection"
        description="Model selection happened entirely inside the training window, using forward-chaining folds. The test window was never involved."
      />
      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader title="Validation accuracy by regularisation strength" subtitle={cv.method} />
          <CardBody className="pt-1">
            <CvCurve models={cv.models} />
            <div className="mt-3 flex flex-wrap gap-4">
              {cv.models.map((item) => (
                <span key={item.key} className="flex items-center gap-1.5 text-[12px] text-ink-2">
                  <span
                    aria-hidden
                    className="h-[2px] w-3 rounded-full"
                    style={{ backgroundColor: item.key === "raw" ? SERIES.raw : SERIES.engineered }}
                  />
                  {item.label} · selected C = {item.bestC}
                </span>
              ))}
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Chronological split" subtitle={split.method} />
          <CardBody className="pt-1">
            <SplitTimeline split={split} />
            <KeyValue
              className="mt-3"
              items={[
                { label: "Model", value: `${model.algorithm} · ${model.solver}` },
                { label: "Pipeline", value: model.pipeline },
                { label: "Selection metric", value: cv.scoring },
                { label: "C grid", value: cv.grid.join(", "), mono: true },
                { label: "Random state", value: int(model.randomState) },
                { label: "Majority class (training)", value: results.majorityClass === 1 ? "UP (1)" : "DOWN (0)" },
              ]}
            />
          </CardBody>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader title="Cross-validation folds" subtitle="Each fold validates on a period strictly later than it fits on." />
          <CardBody className="pt-1">
            <ScrollHint />
            <DataTable columns={foldColumns} rows={cv.folds} rowKey={(row) => String(row.fold)} caption="Forward-chaining folds" />
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Grid search results" />
          <CardBody className="pt-1">
            <Tabs
              label="Grid search per model"
              items={cv.models.map((item) => ({
                id: item.key,
                label: item.label,
                content: (
                  <DataTable
                    columns={gridColumns(item.bestC)}
                    rows={item.results}
                    rowKey={(row) => String(row.C)}
                    caption={`Grid search for ${item.label}`}
                  />
                ),
              }))}
            />
          </CardBody>
        </Card>
      </div>
    </>
  );
}
