import type { Metadata } from "next";

import { ClassBalanceBars } from "@/components/charts/class-balance-bars";
import { ArtifactButton } from "@/components/ui/artifact-links";
import { Badge, DirectionBadge } from "@/components/ui/badge";
import { Card, CardBody, CardHeader, SectionHeading } from "@/components/ui/card";
import { CodeBlock, Formula, InlineCode } from "@/components/ui/code";
import { IconData, IconShield, IconTarget } from "@/components/ui/icon";
import { LeakageCheckList } from "@/components/ui/leakage-checks";
import { PageHeader } from "@/components/ui/page-header";
import { KeyValue } from "@/components/ui/stat";
import { EmptyState, ErrorState, Notice } from "@/components/ui/states";
import { DataTable, ScrollHint, type Column } from "@/components/ui/table";
import { Tabs } from "@/components/ui/tabs";
import { getDashboard } from "@/lib/dashboard";
import type { Cell, OhlcvRow } from "@/lib/dashboard-types";
import { classNames, day, int, num, timestamp } from "@/lib/format";
import { formatPreviewCell, previewHeader } from "@/lib/preview-format";
import { checksPassed } from "@/lib/selectors";

export const metadata: Metadata = {
  title: "Data & Leakage",
  description: "Dataset provenance, cleaning decisions, target construction and the programmatic leakage audit.",
};

export default async function DataPage() {
  const state = await getDashboard();
  if (state.status === "missing") return <EmptyState path={state.path} />;
  if (state.status === "invalid") return <ErrorState path={state.path} reason={state.reason} />;

  const data = state.data;
  const { dataset, cleaning, target, leakageTable } = data;
  const checks = checksPassed(data);
  const labelColumns = new Set(leakageTable.labelColumns);

  const ohlcvColumns: Column<OhlcvRow>[] = [
    { key: "date", header: "Date", sticky: true, render: (row) => day(row.date) },
    { key: "open", header: "Open", align: "right", render: (row) => num(row.open) },
    { key: "high", header: "High", align: "right", render: (row) => num(row.high) },
    { key: "low", header: "Low", align: "right", render: (row) => num(row.low) },
    { key: "close", header: "Close", align: "right", render: (row) => num(row.close) },
    {
      key: "volume",
      header: "Volume",
      align: "right",
      render: (row) => (row.volume == null ? <span className="text-ink-4">unavailable</span> : int(row.volume)),
    },
  ];

  const verificationColumns: Column<Record<string, Cell>>[] = leakageTable.columns.map((column) => ({
    key: column,
    header: previewHeader(column),
    align: column === "Date" || column === "Partition" ? "left" : "right",
    sticky: column === "Date",
    headerClassName: labelColumns.has(column) ? "bg-warn-soft text-warn" : undefined,
    className: classNames(labelColumns.has(column) && "bg-warn-soft/60 text-ink"),
    render: (row) =>
      column === "Target" ? (
        <DirectionBadge value={row[column] === 1 ? 1 : 0} />
      ) : column === "Partition" ? (
        <span className="font-semibold text-ink">{String(row[column])}</span>
      ) : (
        formatPreviewCell(column, row[column])
      ),
  }));

  return (
    <>
      <PageHeader
        eyebrow="Step 1 · integrity"
        title="Data & Leakage Verification"
        description="Where the data came from, what cleaning did to it, how the next-day label is built, and the evidence that no feature can see the future."
        meta={
          <>
            <Badge tone="neutral">
              {int(dataset.cleanRows)} sessions · {day(dataset.firstDate)} → {day(dataset.lastDate)}
            </Badge>
            <Badge tone={checks.passed === checks.total ? "ok" : "down"}>
              {checks.passed}/{checks.total} checks passed
            </Badge>
          </>
        }
        actions={<ArtifactButton file="leakage_checks.csv" label="Audit CSV" />}
      />

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader title="Dataset information" icon={<IconData size={17} />} />
          <CardBody className="pt-1">
            <KeyValue
              items={[
                { label: "Index", value: dataset.name },
                { label: "Ticker", value: dataset.ticker, mono: true },
                { label: "Source", value: dataset.source },
                { label: "Access library", value: dataset.accessLibrary },
                { label: "Frequency", value: dataset.frequency },
                {
                  label: "Requested window",
                  value: `${dataset.requestedStart} → ${dataset.requestedEndExclusive} (exclusive)`,
                },
                { label: "Sessions downloaded", value: int(dataset.rawRows) },
                { label: "Sessions after cleaning", value: int(dataset.cleanRows) },
                { label: "Usable labelled rows", value: int(dataset.usableRows) },
                { label: "Retrieved", value: timestamp(dataset.retrievedAtUtc) },
                { label: "Snapshot SHA-256", value: dataset.sha256?.slice(0, 24) ?? "—", mono: true },
              ]}
            />
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Cleaning report"
            subtitle="Cleaning never edits a price: it parses, sorts, de-duplicates and removes rows that are not complete sessions."
          />
          <CardBody className="pt-1">
            <KeyValue
              items={[
                { label: "Input already sorted by date", value: cleaning.inputWasSorted ? "Yes" : "No" },
                { label: "Unparseable dates removed", value: int(cleaning.unparseableDatesRemoved) },
                { label: "Duplicate dates removed", value: int(cleaning.duplicateDatesRemoved) },
                { label: "Incomplete sessions removed", value: int(cleaning.incompleteRowsRemoved) },
                { label: "Impossible values removed", value: int(cleaning.impossibleRowsRemoved) },
                { label: "High below Open/Close/Low", value: int(cleaning.highBelowOpenOrClose) },
                { label: "Low above Open/Close/High", value: int(cleaning.lowAboveOpenOrClose) },
                { label: "Sessions without reported volume", value: int(cleaning.volumeUnavailableRows) },
                { label: "Excluded: indicator warm-up", value: int(cleaning.modelingExclusions.warmupRows) },
                {
                  label: "Excluded: undefined volume features",
                  value: int(cleaning.modelingExclusions.undefinedFeatureRowsAfterWarmup),
                },
                { label: "Excluded: final unlabelled row", value: int(cleaning.modelingExclusions.unlabelledFinalRows) },
              ]}
            />
            {cleaning.volumeUnavailableDates.length > 0 ? (
              <details className="mt-3 rounded-xl border border-line bg-subtle px-3.5 py-2.5">
                <summary className="cursor-pointer text-[12.5px] font-semibold text-ink-2">
                  Sessions reporting zero volume ({cleaning.volumeUnavailableDates.length})
                </summary>
                <p className="num mt-2 text-[11.5px] leading-relaxed text-ink-3">
                  {cleaning.volumeUnavailableDates.join(" · ")}
                </p>
              </details>
            ) : null}
            <Notice className="mt-3">
              Zero turnover is not plausible for the index, so those sessions are recorded as{" "}
              <strong>volume unavailable</strong> rather than a real 0. Their prices stay in the series — deleting them
              would make the previous day&rsquo;s next-day label span two sessions — and rows whose volume features are
              undefined are excluded from modelling for all four approaches alike.
            </Notice>
          </CardBody>
        </Card>
      </div>

      <SectionHeading
        className="mt-6"
        title="Historical OHLCV data"
        description="The cleaned series, exactly as the models see it."
      />
      <Card>
        <CardBody>
          <Tabs
            label="OHLCV preview"
            items={[
              {
                id: "head",
                label: "First sessions",
                content: (
                  <DataTable columns={ohlcvColumns} rows={data.ohlcvPreview.head} rowKey={(row) => row.date} />
                ),
              },
              {
                id: "tail",
                label: "Latest sessions",
                content: (
                  <DataTable columns={ohlcvColumns} rows={data.ohlcvPreview.tail} rowKey={(row) => row.date} />
                ),
              },
            ]}
          />
        </CardBody>
      </Card>

      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader title="Target definition" icon={<IconTarget size={17} />} />
          <CardBody className="flex flex-col gap-3 pt-1">
            <Formula label="Next-day direction">{target.formula}</Formula>
            <CodeBlock tone="dark">{target.code}</CodeBlock>
            <div className="flex flex-wrap gap-2">
              <DirectionBadge value={1} label={target.positiveLabel} />
              <DirectionBadge value={0} label={target.negativeLabel} />
            </div>
            <ul className="flex list-disc flex-col gap-1.5 pl-5 text-[12.5px] leading-relaxed text-ink-2">
              <li>
                Using tomorrow&rsquo;s close for the <strong>label</strong> is correct; using it in any{" "}
                <strong>feature</strong> is forbidden. <InlineCode>Next_Date</InlineCode> and{" "}
                <InlineCode>Next_Close</InlineCode> exist only for auditing.
              </li>
              <li>
                The final session ({day(target.finalRow.date)}, close {num(target.finalRow.close)}) has no next close,
                so its label is undefined and the row is excluded from training and testing.
              </li>
              <li>
                {int(target.unchangedCloses)} sessions closed exactly unchanged and are labelled DOWN, which the
                definition states explicitly.
              </li>
            </ul>
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Class balance"
            subtitle="Accuracy only means something against this floor: a rule that always predicts UP already scores the test UP share."
          />
          <CardBody className="pt-1">
            <ClassBalanceBars splits={data.classBalance.splits} />
          </CardBody>
        </Card>
      </div>

      <SectionHeading
        className="mt-6"
        title="Leakage verification"
        description="Features and label side by side across the train/test boundary. At the close of each Date every value left of Next_Date is known; the shaded columns are only revealed one session later."
      />
      <Card>
        <CardBody>
          <ScrollHint />
          <DataTable
            columns={verificationColumns}
            rows={leakageTable.rows}
            rowKey={(row) => String(row.Date)}
            caption="Feature rows alongside their target labels around the train/test boundary"
            footnote="The embargo row is purged from both partitions so that no training label is computed from a test-period close."
          />
        </CardBody>
      </Card>

      <SectionHeading
        className="mt-6"
        title="Programmatic checks"
        description="Claims are not evidence: each check below is executed by the notebook, and the run fails if any of them does."
      />
      <Card>
        <CardHeader
          title={`${checks.passed} of ${checks.total} checks passed`}
          icon={<IconShield size={17} />}
          subtitle={`Truncation test: every feature recomputed on ${data.truncationTest.cutPoints} truncated histories, largest absolute difference ${Math.max(
            ...data.truncationTest.features.map((feature) => feature.maxAbsDiff),
          ).toExponential(1)}`}
        />
        <CardBody className="pt-1">
          <LeakageCheckList checks={data.leakageChecks} />
        </CardBody>
      </Card>
    </>
  );
}
