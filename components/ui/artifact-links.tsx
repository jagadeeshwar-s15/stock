import { IconDownload } from "./icon";
import { artifactHref } from "@/lib/artifacts";
import { classNames } from "@/lib/format";
import type { Artifact } from "@/lib/dashboard-types";

const KIND_LABEL: Record<Artifact["kind"], string> = {
  csv: "CSV",
  png: "PNG",
  json: "JSON",
  ipynb: "Notebook",
};

/** A single download button for one pipeline artifact. */
export function ArtifactButton({
  file,
  label,
  className,
}: {
  file: string;
  label: string;
  className?: string;
}) {
  return (
    <a href={artifactHref(file)} download className={classNames("btn", className)}>
      <IconDownload size={16} />
      {label}
    </a>
  );
}

/** Grid of every artifact the pipeline produced. */
export function ArtifactList({ artifacts }: { artifacts: Artifact[] }) {
  return (
    <ul className="grid gap-2 sm:grid-cols-2">
      {artifacts.map((artifact) => (
        <li key={artifact.file}>
          <a
            href={artifactHref(artifact.file)}
            download
            className="flex items-center gap-3 rounded-xl border border-line px-3 py-2.5 transition-colors hover:bg-subtle"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-subtle text-ink-3">
              <IconDownload size={15} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[12.5px] font-semibold text-ink">{artifact.label}</span>
              <span className="block truncate font-mono text-[11px] text-ink-4">{artifact.file}</span>
            </span>
            <span className="shrink-0 rounded-full bg-subtle px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-ink-3">
              {KIND_LABEL[artifact.kind]}
            </span>
          </a>
        </li>
      ))}
    </ul>
  );
}
