import "server-only";

import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { cache } from "react";
import { connection } from "next/server";

import { SCHEMA_VERSION, type Dashboard, type DashboardState } from "./dashboard-types";

/**
 * Reads the JSON the ML pipeline wrote. The dashboard renders those values and
 * never recomputes them, which keeps the notebook the single source of truth.
 *
 * The file is read at request time, so re-running the pipeline is reflected on
 * the next page load without rebuilding the app. `DASHBOARD_DATA_PATH` can
 * point at a different location (useful when the pipeline runs elsewhere).
 */

const DEFAULT_RELATIVE_PATH = path.join("ml", "results", "dashboard.json");

export function dashboardFilePath(): string {
  const configured = process.env.DASHBOARD_DATA_PATH;
  return configured ? path.resolve(configured) : path.join(process.cwd(), DEFAULT_RELATIVE_PATH);
}

/** Path shown in the UI: relative to the project, never an absolute machine path. */
function displayPath(absolute: string): string {
  const relative = path.relative(process.cwd(), absolute);
  return (relative.startsWith("..") ? DEFAULT_RELATIVE_PATH : relative).split(path.sep).join("/");
}

const REQUIRED_OBJECTS = [
  "project",
  "dataset",
  "cleaning",
  "latest",
  "target",
  "leakageTable",
  "truncationTest",
  "classBalance",
  "features",
  "featurePreview",
  "split",
  "cv",
  "model",
  "results",
  "rollingAccuracy",
  "environment",
] as const;

const REQUIRED_ARRAYS = [
  "priceHistory",
  "leakageChecks",
  "indicatorSeries",
  "classificationReports",
  "coefficients",
  "predictions",
  "findings",
  "limitations",
  "artifacts",
] as const;

/** Structural validation: enough to fail loudly on a stale or truncated file. */
function validate(value: unknown): string | null {
  if (typeof value !== "object" || value === null) return "the file does not contain a JSON object";
  const payload = value as Record<string, unknown>;

  if (payload.schemaVersion !== SCHEMA_VERSION) {
    return `schema version ${String(payload.schemaVersion)} does not match the version this app expects (${SCHEMA_VERSION}). Re-run the pipeline.`;
  }
  for (const key of REQUIRED_OBJECTS) {
    if (typeof payload[key] !== "object" || payload[key] === null) return `"${key}" is missing or not an object`;
  }
  for (const key of REQUIRED_ARRAYS) {
    if (!Array.isArray(payload[key])) return `"${key}" is missing or not an array`;
  }
  const results = payload.results as { approaches?: unknown };
  if (!Array.isArray(results.approaches) || results.approaches.length !== 4) {
    return "results.approaches must list the four compared approaches";
  }
  return null;
}

async function readDashboard(): Promise<DashboardState> {
  const file = dashboardFilePath();
  const shown = displayPath(file);
  try {
    const [contents, info] = await Promise.all([readFile(file, "utf8"), stat(file)]);
    const parsed: unknown = JSON.parse(contents);
    const problem = validate(parsed);
    if (problem) return { status: "invalid", path: shown, reason: problem };
    return {
      status: "ok",
      data: parsed as Dashboard,
      source: { path: shown, modifiedAt: info.mtime.toISOString() },
    };
  } catch (error) {
    if ((error as NodeJS.ErrnoException)?.code === "ENOENT") {
      return { status: "missing", path: shown };
    }
    const reason = error instanceof Error ? error.message : "unknown error";
    return { status: "invalid", path: shown, reason };
  }
}

/**
 * Cached per request (React.cache), so several components on one page share a
 * single read of the file.
 */
export const getDashboard = cache(async (): Promise<DashboardState> => {
  await connection();
  return readDashboard();
});
