import type { Metadata } from "next";

import { ClassBalanceBars } from "@/components/charts/class-balance-bars";
import { DirectionTimeline } from "@/components/charts/direction-timeline";
import { MultiLineChart } from "@/components/charts/multi-line-chart";
import { ArtifactList } from "@/components/ui/artifact-links";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody, CardHeader, SectionHeading } from "@/components/ui/card";
import { IconInsights } from "@/components/ui/icon";
import { PageHeader } from "@/components/ui/page-header";
import { Stat } from "@/components/ui/stat";
import { EmptyState, ErrorState, Notice } from "@/components/ui/states";
import { Tabs } from "@/components/ui/tabs";
import { SERIES } from "@/lib/chart-theme";
import { getDashboard } from "@/lib/dashboard";
import { day, int, num, pValue, pct, pp } from "@/lib/format";
import { approach, bestApproach, bestBaseline, significance } from "@/lib/selectors";

export const metadata: Metadata = {
  title: "Insights & Results",
  description: "What the executed experiment shows about next-day predictability, and what it does not.",
};

export default async function InsightsPage() {
  const state = await getDashboard();
  if (state.status === "missing") return <EmptyState path={state.path} />;
  if (state.status === "invalid") return <ErrorState path={state.path} reason={state.reason} />;

  const data = state.data;
  const engineered = approach(data, "engineered");
  const raw = approach(data, "raw");
  const persistence = approach(data, "persistence");
  const majority = approach(data, "majority");
  const best = bestApproach(data);
  const baseline = bestBaseline(data);
  const versusBaseline = significance(data, `Engineered Features vs ${baseline.label}`);

  const rollingDates = data.rollingAccuracy.points.map((point) => String(point.d));
  const rollingSeries = [
    { key: "engineered", label: "Engineered", color: SERIES.engineered },
    { key: "raw", label: "Raw OHLCV", color: SERIES.raw },
    { key: "persistence", label: "Persistence", color: SERIES.persistence },
  ].map((series) => ({
    ...series,
    values: data.rollingAccuracy.points.map((point) => {
      const value = point[series.key];
      return typeof value === "number" ? value : null;
    }),
  }));

  return (
    <>
      <PageHeader
        eyebrow="Step 4 · interpretation"
        title="Insights & Results"
        description={`Every answer below is generated from the computed metrics on the ${int(engineered.n)} test sessions, so the text cannot drift from the numbers.`}
        meta={
          <>
            <Badge tone={best.kind === "model" ? "accent" : "warn"}>
              Most accurate: {best.label} ({pct(best.accuracy)})
            </Badge>
            <Badge tone="neutral">
              Test window {day(data.split.test.start)} → {day(data.split.test.end)}
            </Badge>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat
          label="Engineered model"
          value={pct(engineered.accuracy)}
          hint={`Balanced accuracy ${pct(engineered.balancedAccuracy, 1)} · ROC-AUC ${num(engineered.rocAuc, 3)}`}
          accent={SERIES.engineered}
        />
        <Stat
          label="vs Raw OHLCV"
          value={pp(engineered.accuracy - raw.accuracy)}
          deltaTone="neutral"
          hint={`${raw.label} reached ${pct(raw.accuracy)}`}
          accent={SERIES.raw}
        />
        <Stat
          label="vs Majority Class"
          value={pp(engineered.accuracy - majority.accuracy)}
          hint={`Always predicting UP scores ${pct(majority.accuracy)}`}
          accent={SERIES.majority}
        />
        <Stat
          label="vs Persistence"
          value={pp(engineered.accuracy - persistence.accuracy)}
          deltaTone={engineered.accuracy >= persistence.accuracy ? "up" : "down"}
          hint={`Tomorrow-matches-today scores ${pct(persistence.accuracy)}`}
          accent={SERIES.persistence}
        />
      </div>

      <Notice tone="warn" className="mt-4" title="Read this before the charts">
        The two models predict UP on {pct(engineered.predictedUpRate, 0)} of test sessions, which reproduces the
        Majority baseline exactly. Their apparent recall of {pct(engineered.recall, 0)} is a consequence of that, not
        evidence of skill{versusBaseline ? `, and the gap to ${baseline.label} is not statistically significant (exact McNemar p = ${pValue(versusBaseline.pValue)})` : ""}.
      </Notice>

      <SectionHeading
        className="mt-6"
        title="Actual vs predicted direction"
        description="The full test window in chronological order. Inside each lane an UP tick sits in the upper half and a DOWN tick in the lower half, so direction is readable without relying on colour."
      />
      <Card>
        <CardBody>
          <Tabs
            label="Approach shown in the timeline"
            items={[
              {
                id: "engineered",
                label: "Engineered",
                content: (
                  <DirectionTimeline predictions={data.predictions} series="engineered" label="Engineered Features" />
                ),
              },
              {
                id: "raw",
                label: "Raw OHLCV",
                content: <DirectionTimeline predictions={data.predictions} series="raw" label="Raw OHLCV" />,
              },
              {
                id: "persistence",
                label: "Persistence",
                content: <DirectionTimeline predictions={data.predictions} series="persistence" label="Persistence" />,
              },
            ]}
          />
        </CardBody>
      </Card>

      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader
            title={`Trailing ${data.rollingAccuracy.window}-session accuracy`}
            subtitle="A diagnostic of stability over time, not a headline metric."
          />
          <CardBody className="pt-1">
            <MultiLineChart
              dates={rollingDates}
              series={rollingSeries}
              valueFormat={{ kind: "percent", digits: 1 }}
              axisFormat={{ kind: "percent", digits: 0 }}
              referenceLines={[
                { value: majority.accuracy, label: `Majority ${pct(majority.accuracy, 1)}`, color: SERIES.majority },
                { value: 0.5, label: "50%" },
              ]}
              ariaLabel={`Trailing ${data.rollingAccuracy.window}-session accuracy for the engineered model, raw model and persistence baseline across the test window`}
            />
            <div className="mt-3 flex flex-wrap gap-4">
              {rollingSeries.map((series) => (
                <span key={series.key} className="flex items-center gap-1.5 text-[12px] text-ink-2">
                  <span aria-hidden className="h-[2px] w-3 rounded-full" style={{ backgroundColor: series.color }} />
                  {series.label}
                </span>
              ))}
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Class balance"
            subtitle="Why accuracy has to be read against a floor rather than against 50%."
          />
          <CardBody className="pt-1">
            <ClassBalanceBars splits={data.classBalance.splits} />
          </CardBody>
        </Card>
      </div>

      <SectionHeading
        className="mt-6"
        title="Key findings"
        description="The assignment's interpretation questions, answered from the executed results."
      />
      <Card>
        <CardHeader title="Evidence-based answers" icon={<IconInsights size={17} />} />
        <CardBody className="pt-1">
          <ol className="flex flex-col divide-y divide-line">
            {data.findings.map((item) => (
              <li key={item.question} className="flex flex-col gap-1 py-3 first:pt-0 last:pb-0">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-[13px] font-semibold text-ink">{item.question}</p>
                  <Badge
                    tone={
                      item.verdict === "Yes" || item.verdict === "Meaningful"
                        ? "ok"
                        : item.verdict === "No"
                          ? "down"
                          : "neutral"
                    }
                  >
                    {item.verdict}
                  </Badge>
                </div>
                <p className="text-[12.5px] leading-relaxed text-ink-2">{item.answer}</p>
              </li>
            ))}
          </ol>
        </CardBody>
      </Card>

      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader title="Limitations" subtitle="What this experiment cannot tell you." />
          <CardBody className="pt-1">
            <ul className="flex list-disc flex-col gap-2 pl-5 text-[12.5px] leading-relaxed text-ink-2">
              {data.limitations.map((limitation) => (
                <li key={limitation}>{limitation}</li>
              ))}
            </ul>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Download the results" subtitle="Every table and figure the notebook produced." />
          <CardBody className="pt-1">
            <ArtifactList artifacts={data.artifacts} />
          </CardBody>
        </Card>
      </div>
    </>
  );
}
