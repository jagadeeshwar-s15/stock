import Link from "next/link";

import { AccuracyDots } from "@/components/charts/accuracy-dots";
import { DirectionTimeline } from "@/components/charts/direction-timeline";
import { PriceArea } from "@/components/charts/price-area";
import { NAV_ITEMS } from "@/components/shell/nav";
import { ArtifactButton } from "@/components/ui/artifact-links";
import { Badge, DirectionBadge } from "@/components/ui/badge";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { Stat } from "@/components/ui/stat";
import { EmptyState, ErrorState, Notice } from "@/components/ui/states";
import { SERIES } from "@/lib/chart-theme";
import { getDashboard } from "@/lib/dashboard";
import { day, int, num, pct, pp, signed, timestamp } from "@/lib/format";
import { approach, bestApproach, bestBaseline, checksPassed, finding } from "@/lib/selectors";

export default async function OverviewPage() {
  const state = await getDashboard();
  if (state.status === "missing") return <EmptyState path={state.path} />;
  if (state.status === "invalid") return <ErrorState path={state.path} reason={state.reason} />;

  const data = state.data;
  const { latest, dataset, split } = data;
  const engineered = approach(data, "engineered");
  const best = bestApproach(data);
  const baseline = bestBaseline(data);
  const checks = checksPassed(data);
  const rising = latest.change >= 0;
  const headline = finding(data, "did the engineered model beat both");

  return (
    <>
      <PageHeader
        eyebrow={`${dataset.name} (${dataset.ticker}) · next-day direction`}
        title="Overview"
        description="Every number on this dashboard comes from the executed notebook: a logistic-regression classifier trained on daily OHLCV data, compared against two naive baselines on a test window it never saw during training."
        meta={
          <>
            <Badge tone="neutral">Data through {day(dataset.lastDate)}</Badge>
            <Badge tone={checks.passed === checks.total ? "ok" : "down"}>
              {checks.passed}/{checks.total} leakage checks passed
            </Badge>
            <Badge tone="neutral">Pipeline run {timestamp(data.generatedAt)}</Badge>
          </>
        }
        actions={<ArtifactButton file="four_way_comparison.csv" label="Comparison CSV" />}
      />

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader
            title={`${dataset.name} closing level`}
            subtitle={`${int(dataset.cleanRows)} sessions from ${day(dataset.firstDate)} to ${day(dataset.lastDate)} · the shaded area is the untouched test window`}
          />
          <CardBody className="pt-1">
            <div className="mb-3 flex flex-wrap items-end gap-x-4 gap-y-1">
              <p className="text-[34px] font-bold leading-none tracking-tight text-ink sm:text-[40px]">
                {num(latest.close)}
              </p>
              <p className={`text-[14px] font-semibold ${rising ? "text-up-ink" : "text-down-ink"}`}>
                {rising ? "▲" : "▼"} {signed(latest.change)} ({pct(latest.changePct)})
              </p>
              <p className="text-[12px] text-ink-3">
                close on {day(latest.date)} vs {day(latest.prevDate)}
              </p>
            </div>
            <PriceArea
              points={data.priceHistory}
              testStart={split.test.start}
              height={240}
              label={`${dataset.name} close`}
            />
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Model output for the next session"
            subtitle={data.nextSession ? `First session after ${day(data.nextSession.basedOnDate)}` : undefined}
          />
          <CardBody className="flex flex-col gap-3 pt-1">
            {data.nextSession ? (
              <>
                <div className="flex items-center gap-3">
                  <DirectionBadge value={data.nextSession.prediction} className="px-3 py-1.5 text-[13px]" />
                  <div>
                    <p className="text-[24px] font-bold leading-none text-ink">
                      {pct(data.nextSession.probabilityUp, 1)}
                    </p>
                    <p className="text-[11.5px] text-ink-3">predicted probability of UP</p>
                  </div>
                </div>
                <p className="text-[12.5px] leading-relaxed text-ink-2">
                  Produced by the evaluated engineered model. Its probability sits close to the training base rate of{" "}
                  {pct(data.results.majorityTraining.upPct, 1)} UP days
                  {engineered.predictedUpRate === 1
                    ? ", and this model predicted UP on every test session, so the output carries no information beyond that base rate."
                    : "."}
                </p>
                <Notice tone="warn">
                  Research and education only. This is not investment advice, not a trading signal, and the model does
                  not beat a naive rule on the test window.
                </Notice>
              </>
            ) : (
              <p className="text-[13px] text-ink-2">
                The latest session does not have a complete set of features, so no model output is shown.
              </p>
            )}
          </CardBody>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat
          label="Most accurate approach"
          value={pct(best.accuracy)}
          hint={`${best.label} (${best.kind}) on ${int(best.n)} test sessions`}
          accent={SERIES[best.key]}
        />
        <Stat
          label="Engineered model"
          value={pct(engineered.accuracy)}
          delta={`${pp(engineered.accuracy - baseline.accuracy)} vs ${baseline.label}`}
          deltaTone={engineered.accuracy > baseline.accuracy ? "up" : engineered.accuracy < baseline.accuracy ? "down" : "neutral"}
          hint={`ROC-AUC ${num(engineered.rocAuc, 3)} · predicted UP on ${pct(engineered.predictedUpRate, 0)} of test days`}
          accent={SERIES.engineered}
        />
        <Stat
          label="Usable sessions"
          value={int(dataset.usableRows)}
          hint={`${int(split.train.rows)} train · ${int(split.embargo.rows)} embargo · ${int(split.test.rows)} test`}
        />
        <Stat
          label="Leakage & validity checks"
          value={`${checks.passed}/${checks.total}`}
          hint={`Truncation test across ${data.truncationTest.cutPoints} cut points, largest difference ${data.truncationTest.features[0]?.maxAbsDiff === 0 ? "0.0" : "see audit"}`}
        />
      </div>

      {headline ? (
        <Notice tone="accent" className="mt-4" title="Headline finding">
          <strong>{headline.question}</strong> {headline.verdict}. {headline.answer} The full evidence is on the{" "}
          <Link href="/insights" className="font-semibold text-accent underline underline-offset-2">
            Insights &amp; Results
          </Link>{" "}
          page.
        </Notice>
      ) : null}

      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader
            title="Model performance on the test set"
            subtitle={`All four approaches scored on the same ${int(split.test.rows)} sessions, ${day(split.test.start)} to ${day(split.test.end)}`}
          />
          <CardBody className="pt-1">
            <AccuracyDots approaches={data.results.approaches} reference={approach(data, "majority").accuracy} />
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Actual vs predicted direction"
            subtitle="Engineered model across the full test window"
            action={
              <Link href="/insights" className="text-[12px] font-semibold text-accent underline underline-offset-2">
                Details
              </Link>
            }
          />
          <CardBody className="pt-1">
            <DirectionTimeline predictions={data.predictions} series="engineered" label="Engineered Features" />
          </CardBody>
        </Card>
      </div>

      <nav aria-label="Sections" className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {NAV_ITEMS.filter((item) => item.href !== "/").map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="card card-pad flex items-start gap-3 transition-colors hover:bg-subtle"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent">
              <item.icon size={18} />
            </span>
            <span className="min-w-0">
              <span className="block text-[13.5px] font-semibold text-ink">{item.label}</span>
              <span className="mt-0.5 block text-[12px] leading-relaxed text-ink-3">{item.description}</span>
            </span>
          </Link>
        ))}
      </nav>
    </>
  );
}
