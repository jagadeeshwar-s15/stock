import { day, int, pct } from "@/lib/format";
import type { SplitInfo } from "@/lib/dashboard-types";

/**
 * Proportional view of the chronological split: training window, the purged
 * embargo session, and the untouched test window.
 */
export function SplitTimeline({ split }: { split: SplitInfo }) {
  const total = split.train.rows + split.embargo.rows + split.test.rows;
  const trainShare = (split.train.rows / total) * 100;
  const testShare = (split.test.rows / total) * 100;

  return (
    <div>
      <div
        className="flex h-9 overflow-hidden rounded-lg"
        role="img"
        aria-label={`Training window ${day(split.train.start)} to ${day(split.train.end)}, ${int(split.train.rows)} sessions; ${int(split.embargo.rows)} embargo session purged; test window ${day(split.test.start)} to ${day(split.test.end)}, ${int(split.test.rows)} sessions.`}
      >
        <div
          className="flex items-center justify-center bg-accent text-[11px] font-semibold text-white"
          style={{ width: `${trainShare}%` }}
        >
          Train {pct(split.train.rows / total, 0)}
        </div>
        <div className="w-[3px] shrink-0 bg-warn" title={`Embargo: ${int(split.embargo.rows)} session purged`} />
        <div
          className="flex items-center justify-center bg-accent-soft text-[11px] font-semibold text-accent"
          style={{ width: `${testShare}%` }}
        >
          Test {pct(split.test.rows / total, 0)}
        </div>
      </div>

      <div className="mt-2 grid gap-2 sm:grid-cols-3">
        <Block label="Train" range={`${day(split.train.start)} → ${day(split.train.end)}`} rows={split.train.rows} color="bg-accent" />
        <Block
          label="Embargo (purged)"
          range={split.embargo.start ? day(split.embargo.start) : "—"}
          rows={split.embargo.rows}
          color="bg-warn"
        />
        <Block label="Test" range={`${day(split.test.start)} → ${day(split.test.end)}`} rows={split.test.rows} color="bg-accent-soft border border-accent/30" />
      </div>
    </div>
  );
}

function Block({ label, range, rows, color }: { label: string; range: string; rows: number; color: string }) {
  return (
    <div className="rounded-xl border border-line bg-subtle px-3 py-2">
      <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-ink-3">
        <span aria-hidden className={`h-2.5 w-2.5 rounded-sm ${color}`} />
        {label}
      </p>
      <p className="num mt-1 text-[12.5px] font-semibold text-ink">{range}</p>
      <p className="num text-[11.5px] text-ink-3">{int(rows)} sessions</p>
    </div>
  );
}
