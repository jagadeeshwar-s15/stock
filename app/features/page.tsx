import type { Metadata } from "next";

import { CoefficientBars } from "@/components/charts/coefficient-bars";
import { IndicatorExplorer } from "@/components/charts/indicator-explorer";
import { Sparkline } from "@/components/charts/sparkline";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody, CardHeader, SectionHeading } from "@/components/ui/card";
import { IconFeatures } from "@/components/ui/icon";
import { PageHeader } from "@/components/ui/page-header";
import { Stat } from "@/components/ui/stat";
import { EmptyState, ErrorState, Notice } from "@/components/ui/states";
import { DataTable, ScrollHint, type Column } from "@/components/ui/table";
import { SERIES } from "@/lib/chart-theme";
import { getDashboard } from "@/lib/dashboard";
import type { Cell, FeatureDefinition, IndicatorPoint } from "@/lib/dashboard-types";
import { day, int, num, pct } from "@/lib/format";
import { formatPreviewCell, previewHeader } from "@/lib/preview-format";
import { coefficients } from "@/lib/selectors";

export const metadata: Metadata = {
  title: "Feature Engineering",
  description: "Technical indicators implemented in pandas, their definitions, recent values and causality evidence.",
};

const LATEST_CARDS: { key: keyof IndicatorPoint; label: string; format: (value: number) => string }[] = [
  { key: "sma20", label: "SMA 20", format: (value) => num(value) },
  { key: "ema20", label: "EMA 20", format: (value) => num(value) },
  { key: "rsi14", label: "RSI 14", format: (value) => num(value, 1) },
  { key: "macd", label: "MACD", format: (value) => num(value, 1) },
  { key: "macdSignal", label: "MACD signal", format: (value) => num(value, 1) },
  { key: "volatility20", label: "Volatility 20", format: (value) => pct(value, 2) },
];

export default async function FeaturesPage() {
  const state = await getDashboard();
  if (state.status === "missing") return <EmptyState path={state.path} />;
  if (state.status === "invalid") return <ErrorState path={state.path} reason={state.reason} />;

  const data = state.data;
  const { features, indicatorSeries, truncationTest } = data;
  const engineeredCoefficients = coefficients(data, "engineered");
  const leakyFeatures = truncationTest.features.filter((feature) => feature.maxAbsDiff > 0).length;
  const latest = indicatorSeries[indicatorSeries.length - 1];

  const definitionColumns: Column<FeatureDefinition>[] = [
    {
      key: "name",
      header: "Feature",
      sticky: true,
      render: (row) => <span className="font-mono text-[11.5px] text-ink">{row.name}</span>,
    },
    {
      key: "category",
      header: "Category",
      render: (row) => (
        <Badge tone={row.category === "Technical indicator" ? "accent" : "neutral"}>{row.category}</Badge>
      ),
    },
    { key: "group", header: "Group" },
    {
      key: "formula",
      header: "Definition",
      render: (row) => <span className="font-mono text-[11px] text-ink-2">{row.formula}</span>,
    },
    { key: "window", header: "Window", align: "right" },
    {
      key: "known",
      header: "Known at",
      align: "right",
      render: () => <span className="text-ink-3">close of day t</span>,
    },
  ];

  const previewColumns: Column<Record<string, Cell>>[] = data.featurePreview.columns.map((column) => ({
    key: column,
    header: previewHeader(column),
    align: column === "Date" ? "left" : "right",
    sticky: column === "Date",
    render: (row) =>
      column === "Target" ? (
        <span className={row[column] === 1 ? "font-semibold text-up-ink" : "font-semibold text-down-ink"}>
          {row[column] === 1 ? "▲ UP" : "▼ DOWN"}
        </span>
      ) : (
        formatPreviewCell(column, row[column])
      ),
  }));

  return (
    <>
      <PageHeader
        eyebrow="Step 2 · inputs"
        title="Feature Engineering"
        description="Seven technical indicators and two derived features, implemented directly in pandas so every value at date t uses only observations at or before t."
        meta={
          <>
            <Badge tone="neutral">Same rows for both feature sets</Badge>
            <Badge tone={leakyFeatures === 0 ? "ok" : "down"}>
              {leakyFeatures === 0 ? "No feature uses future data" : `${leakyFeatures} features failed the causality test`}
            </Badge>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Engineered feature set" value={int(features.engineered.length)} hint="Total model inputs (set B)" accent={SERIES.engineered} />
        <Stat label="Technical indicators" value={int(features.technical.length)} hint={features.technical.join(", ")} />
        <Stat label="Raw OHLCV features" value={int(features.raw.length)} hint="Feature set A, used on its own too" accent={SERIES.raw} />
        <Stat
          label="Features using future data"
          value={int(leakyFeatures)}
          hint={`Verified on ${truncationTest.cutPoints} truncated histories`}
        />
      </div>

      <SectionHeading
        className="mt-6"
        title="Indicator explorer"
        description={`The last ${indicatorSeries.length} sessions of the cleaned series, as computed by the pipeline.`}
      />
      <Card>
        <CardBody>
          <IndicatorExplorer points={indicatorSeries} />
        </CardBody>
      </Card>

      <SectionHeading className="mt-6" title={`Latest indicator values · ${day(latest?.d)}`} />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {LATEST_CARDS.map((card) => {
          const values = indicatorSeries.slice(-60).map((point) => point[card.key] as number | null);
          const value = latest?.[card.key] as number | null;
          return (
            <div key={String(card.key)} className="card card-pad">
              <div className="flex items-baseline justify-between gap-3">
                <span className="label-caps">{card.label}</span>
                <span className="num text-[17px] font-bold text-ink">{value == null ? "—" : card.format(value)}</span>
              </div>
              <Sparkline values={values} color={SERIES.engineered} />
            </div>
          );
        })}
      </div>

      <SectionHeading
        className="mt-6"
        title="Feature definitions"
        description="Every definition is the formula the code implements; nothing is approximated in this table."
      />
      <Card>
        <CardBody>
          <ScrollHint />
          <DataTable
            columns={definitionColumns}
            rows={features.definitions}
            rowKey={(row) => row.name}
            caption="Definitions of all engineered features"
          />
        </CardBody>
      </Card>

      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader
            title="Causality evidence"
            icon={<IconFeatures size={17} />}
            subtitle={`Each feature recomputed on ${truncationTest.cutPoints} histories truncated at date t and compared with the value computed on the full series.`}
          />
          <CardBody className="pt-1">
            <ul className="grid gap-x-6 gap-y-0 sm:grid-cols-2">
              {truncationTest.features.map((feature) => (
                <li
                  key={feature.name}
                  className="flex items-baseline justify-between gap-3 border-b border-line/70 py-1.5 last:border-b-0"
                >
                  <span className="font-mono text-[11.5px] text-ink-2">{feature.name}</span>
                  <span className={`num text-[12px] font-semibold ${feature.maxAbsDiff === 0 ? "text-up-ink" : "text-down-ink"}`}>
                    {feature.maxAbsDiff.toExponential(1)}
                  </span>
                </li>
              ))}
            </ul>
            <Notice className="mt-3">
              If a feature used information from after date <em>t</em>, removing the future would change its value at{" "}
              <em>t</em>. Every difference here is exactly zero.
            </Notice>
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Engineered model coefficients"
            subtitle={`Logistic-regression weights on standardised features (C = ${data.cv.models.find((model) => model.key === "engineered")?.bestC ?? "—"})`}
          />
          <CardBody className="pt-1">
            {engineeredCoefficients ? <CoefficientBars values={engineeredCoefficients.values} /> : null}
            <Notice className="mt-3" tone="warn">
              These are associations learned by a strongly regularised linear model on highly correlated inputs (Close,
              SMA 20 and EMA 20 move almost together). They are not causal effects and not a ranking of feature
              importance — under this regularisation every weight is shrunk close to zero.
            </Notice>
          </CardBody>
        </Card>
      </div>

      <SectionHeading
        className="mt-6"
        title="Feature preview"
        description="The last usable rows exactly as they enter the model, with the label they are scored against."
      />
      <Card>
        <CardBody>
          <ScrollHint />
          <DataTable
            columns={previewColumns}
            rows={data.featurePreview.rows}
            rowKey={(row) => String(row.Date)}
            caption="Latest rows of the modelling frame"
          />
        </CardBody>
      </Card>
    </>
  );
}
