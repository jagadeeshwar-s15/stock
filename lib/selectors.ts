import type { Approach, ApproachKey, Dashboard, Finding, ModelKey, SignificanceTest } from "./dashboard-types";

/** Small read helpers so pages do not repeat find() calls over the payload. */

export function approach(data: Dashboard, key: ApproachKey): Approach {
  const found = data.results.approaches.find((item) => item.key === key);
  if (!found) throw new Error(`Approach "${key}" is missing from the pipeline output`);
  return found;
}

export function bestApproach(data: Dashboard): Approach {
  return approach(data, data.results.bestApproach);
}

/** The stronger of the two naive baselines. */
export function bestBaseline(data: Dashboard): Approach {
  const persistence = approach(data, "persistence");
  const majority = approach(data, "majority");
  return persistence.accuracy >= majority.accuracy ? persistence : majority;
}

export function significance(data: Dashboard, comparison: string): SignificanceTest | undefined {
  return data.results.significance.find((test) => test.comparison === comparison);
}

export function finding(data: Dashboard, startsWith: string): Finding | undefined {
  return data.findings.find((item) => item.question.toLowerCase().startsWith(startsWith.toLowerCase()));
}

export function coefficients(data: Dashboard, key: ModelKey) {
  return data.coefficients.find((item) => item.key === key);
}

export function classificationReport(data: Dashboard, key: ModelKey) {
  return data.classificationReports.find((item) => item.key === key);
}

export function cvModel(data: Dashboard, key: ModelKey) {
  return data.cv.models.find((item) => item.key === key);
}

export function balance(data: Dashboard, key: "overall" | "train" | "test") {
  const found = data.classBalance.splits.find((item) => item.key === key);
  if (!found) throw new Error(`Class balance for "${key}" is missing from the pipeline output`);
  return found;
}

export function checksPassed(data: Dashboard): { passed: number; total: number } {
  const passed = data.leakageChecks.filter((check) => check.passed).length;
  return { passed, total: data.leakageChecks.length };
}

/** Difference in percentage points between two approaches' accuracy. */
export function accuracyGap(a: Approach, b: Approach): number {
  return a.accuracy - b.accuracy;
}

export function hasArtifact(data: Dashboard, file: string): boolean {
  return data.artifacts.some((artifact) => artifact.file === file);
}
