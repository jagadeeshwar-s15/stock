import path from "node:path";

/**
 * Files the pipeline writes that may be downloaded through
 * `/api/artifacts/<file>`. The allowlist is explicit: a request can only ever
 * resolve to one of these names, so no user input reaches the filesystem path.
 */

const RESULT_FILES = [
  "four_way_comparison.csv",
  "class_balance.csv",
  "test_predictions.csv",
  "classification_reports.csv",
  "confusion_matrices.csv",
  "cv_results.csv",
  "model_coefficients.csv",
  "leakage_checks.csv",
  "actual_vs_predicted_direction.png",
  "actual_vs_predicted_direction_raw.png",
  "four_way_comparison.png",
  "confusion_matrices.png",
  "class_balance.png",
  "train_test_split.png",
  "cv_accuracy_by_C.png",
  "engineered_model_coefficients.png",
  "dashboard.json",
] as const;

const NOTEBOOK_FILE = "stock_price_movement_predictor.ipynb";

const CONTENT_TYPES: Record<string, string> = {
  ".csv": "text/csv; charset=utf-8",
  ".png": "image/png",
  ".json": "application/json; charset=utf-8",
  ".ipynb": "application/x-ipynb+json",
};

export const ARTIFACT_NAMES: readonly string[] = [...RESULT_FILES, NOTEBOOK_FILE];

export function artifactHref(file: string): string {
  return `/api/artifacts/${encodeURIComponent(file)}`;
}

export function resolveArtifact(file: string): { absolutePath: string; contentType: string } | null {
  if (file === NOTEBOOK_FILE) {
    return {
      absolutePath: path.join(process.cwd(), "ml", "notebooks", NOTEBOOK_FILE),
      contentType: CONTENT_TYPES[".ipynb"],
    };
  }
  if (!(RESULT_FILES as readonly string[]).includes(file)) return null;
  return {
    absolutePath: path.join(process.cwd(), "ml", "results", file),
    contentType: CONTENT_TYPES[path.extname(file)] ?? "application/octet-stream",
  };
}
