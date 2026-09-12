/**
 * TypeScript mirror of the JSON contract written by the ML pipeline
 * (`ml/src/dashboard.py`, schema version 1).
 *
 * The dashboard renders these values and never recomputes a metric. When the
 * Python schema changes, bump SCHEMA_VERSION there and update this file.
 */

export const SCHEMA_VERSION = 1;

export type ApproachKey = "persistence" | "majority" | "raw" | "engineered";
export type ModelKey = "raw" | "engineered";
export type SplitKey = "overall" | "train" | "test";

/** A value as rendered in a preview table: numbers, dates or "unavailable". */
export type Cell = string | number | null;

export interface Project {
  title: string;
  track: string;
  objective: string;
  positiveClass: string;
}

export interface Dataset {
  name: string;
  ticker: string;
  source: string;
  accessLibrary: string;
  frequency: string;
  requestedStart: string;
  requestedEndExclusive: string;
  retrievedAtUtc: string | null;
  sha256: string | null;
  firstDate: string;
  lastDate: string;
  rawRows: number;
  cleanRows: number;
  usableRows: number;
  columns: string[];
}

export interface Cleaning {
  inputWasSorted: boolean;
  unparseableDatesRemoved: number;
  duplicateDatesRemoved: number;
  incompleteRowsRemoved: number;
  impossibleRowsRemoved: number;
  volumeUnavailableRows: number;
  volumeUnavailableDates: string[];
  highBelowOpenOrClose: number;
  lowAboveOpenOrClose: number;
  missingValues: Record<string, number>;
  nonNumericValuesCoerced: Record<string, number>;
  modelingExclusions: {
    warmupRows: number;
    undefinedFeatureRowsAfterWarmup: number;
    unlabelledFinalRows: number;
  };
}

export interface LatestSession {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number | null;
  prevDate: string;
  prevClose: number;
  change: number;
  changePct: number;
}

export interface PricePoint {
  d: string;
  c: number;
}

export interface OhlcvRow {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number | null;
}

export interface TargetInfo {
  formula: string;
  code: string;
  positiveLabel: string;
  negativeLabel: string;
  unchangedCloses: number;
  finalRow: { date: string; close: number };
}

export interface LeakageTable {
  columns: string[];
  featureColumns: string[];
  labelColumns: string[];
  rows: Record<string, Cell>[];
}

export interface LeakageCheck {
  id: string;
  ref: string;
  stage: string;
  name: string;
  passed: boolean;
  detail: string;
}

export interface TruncationTest {
  cutPoints: number;
  features: { name: string; maxAbsDiff: number }[];
}

export interface ClassBalanceSplit {
  key: SplitKey;
  label: string;
  up: number;
  down: number;
  total: number;
  upPct: number;
  downPct: number;
  assessment: string;
}

export interface FeatureDefinition {
  name: string;
  category: string;
  group: string;
  formula: string;
  window: string;
  description: string;
}

export interface Features {
  raw: string[];
  technical: string[];
  derived: string[];
  engineered: string[];
  definitions: FeatureDefinition[];
}

export interface IndicatorPoint {
  d: string;
  close: number | null;
  volume: number | null;
  sma20: number | null;
  ema20: number | null;
  rsi14: number | null;
  macd: number | null;
  macdSignal: number | null;
  macdHist: number | null;
  volatility20: number | null;
  return5d: number | null;
  volumeChange: number | null;
}

export interface PartitionRange {
  start: string | null;
  end: string | null;
  rows: number;
}

export interface SplitInfo {
  method: string;
  testFraction: number;
  embargoRows: number;
  train: PartitionRange;
  embargo: PartitionRange;
  test: PartitionRange;
}

export interface CvFold {
  fold: number;
  fitStart: string;
  fitEnd: string;
  validationStart: string;
  validationEnd: string;
  fitRows: number;
  validationRows: number;
}

export interface CvGridResult {
  C: number;
  meanValidationAccuracy: number;
  stdValidationAccuracy: number;
  meanTrainAccuracy: number;
  rank: number;
  folds: number[];
}

export interface CvModel {
  key: ModelKey;
  label: string;
  bestC: number;
  results: CvGridResult[];
}

export interface CrossValidation {
  method: string;
  scoring: string;
  grid: number[];
  folds: CvFold[];
  models: CvModel[];
}

export interface ModelInfo {
  algorithm: string;
  pipeline: string;
  solver: string;
  maxIter: number;
  randomState: number;
}

export interface Confusion {
  tn: number;
  fp: number;
  fn: number;
  tp: number;
}

export interface Approach {
  key: ApproachKey;
  label: string;
  kind: "baseline" | "model";
  accuracy: number;
  accuracyCiLow: number;
  accuracyCiHigh: number;
  precision: number;
  recall: number;
  f1: number;
  balancedAccuracy: number;
  rocAuc: number | null;
  predictedUpRate: number;
  n: number;
  correct: number;
  confusion: Confusion;
}

export interface SignificanceTest {
  comparison: string;
  aOnlyCorrect: number;
  bOnlyCorrect: number;
  discordant: number;
  pValue: number;
}

export interface Results {
  approaches: Approach[];
  bestApproach: ApproachKey;
  majorityClass: 0 | 1;
  majorityTraining: { up: number; down: number; total: number; upPct: number; downPct: number };
  significance: SignificanceTest[];
}

export interface ClassificationReport {
  key: ModelKey;
  label: string;
  rows: {
    label: string;
    precision: number | null;
    recall: number | null;
    f1: number | null;
    support: number;
  }[];
}

export interface Coefficients {
  key: ModelKey;
  label: string;
  intercept: number;
  values: { feature: string; coef: number }[];
}

export interface PredictionRow {
  d: string;
  actual: 0 | 1;
  persistence: 0 | 1;
  majority: 0 | 1;
  raw: 0 | 1;
  rawProb: number;
  engineered: 0 | 1;
  engineeredProb: number;
}

export interface RollingAccuracy {
  window: number;
  points: ({ d: string } & Record<string, number | string | null>)[];
}

export interface NextSession {
  basedOnDate: string;
  model: string;
  probabilityUp: number;
  prediction: 0 | 1;
  note: string;
}

export interface Finding {
  question: string;
  verdict: string;
  answer: string;
}

export interface Artifact {
  file: string;
  label: string;
  kind: "csv" | "png" | "json" | "ipynb";
}

export interface Dashboard {
  schemaVersion: number;
  generatedAt: string;
  project: Project;
  dataset: Dataset;
  cleaning: Cleaning;
  latest: LatestSession;
  priceHistory: PricePoint[];
  ohlcvPreview: { head: OhlcvRow[]; tail: OhlcvRow[] };
  target: TargetInfo;
  leakageTable: LeakageTable;
  leakageChecks: LeakageCheck[];
  truncationTest: TruncationTest;
  classBalance: { splits: ClassBalanceSplit[] };
  features: Features;
  featurePreview: { columns: string[]; rows: Record<string, Cell>[] };
  indicatorSeries: IndicatorPoint[];
  split: SplitInfo;
  cv: CrossValidation;
  model: ModelInfo;
  results: Results;
  classificationReports: ClassificationReport[];
  coefficients: Coefficients[];
  predictions: PredictionRow[];
  rollingAccuracy: RollingAccuracy;
  nextSession: NextSession | null;
  findings: Finding[];
  limitations: string[];
  artifacts: Artifact[];
  environment: Record<string, string>;
}

/** Result of trying to read the pipeline output. */
export type DashboardState =
  | { status: "ok"; data: Dashboard; source: { path: string; modifiedAt: string } }
  | { status: "missing"; path: string }
  | { status: "invalid"; path: string; reason: string };
