"""Programmatic temporal-leakage audit.

Each check returns a :class:`CheckResult` so the notebook, the exported CSV
and the web dashboard all show exactly the same evidence. ``ref`` links each
check to the project's validation checklist (CHECK 1 ... CHECK 20).
"""

from __future__ import annotations

import ast
import inspect
from dataclasses import asdict, dataclass

import numpy as np
import pandas as pd
from sklearn.model_selection import TimeSeriesSplit
from sklearn.pipeline import Pipeline

from . import baselines as baselines_module
from . import features as features_module
from .features import ENGINEERED_FEATURES, add_technical_features
from .split import ChronologicalSplit
from .target import LABEL_COLUMNS

FORBIDDEN_FEATURE_COLUMNS = set(LABEL_COLUMNS) | {"Today_Direction", "Prev_Close"}


@dataclass
class CheckResult:
    id: str
    ref: str
    stage: str
    name: str
    passed: bool
    detail: str


def to_frame(checks: list[CheckResult]) -> pd.DataFrame:
    frame = pd.DataFrame([asdict(c) for c in checks])
    frame["status"] = np.where(frame["passed"], "PASS", "FAIL")
    return frame[["ref", "stage", "name", "status", "detail", "id"]]


# ---------------------------------------------------------------------------
# Data and label checks
# ---------------------------------------------------------------------------
def check_chronology(clean: pd.DataFrame) -> list[CheckResult]:
    return [
        CheckResult("dates_sorted", "CHECK 1", "Data", "Dates sorted chronologically",
                    bool(clean.index.is_monotonic_increasing),
                    f"{len(clean)} sessions from {clean.index.min().date()} to {clean.index.max().date()} "
                    "are strictly increasing."),
        CheckResult("dates_unique", "CHECK 2", "Data", "No duplicate dates",
                    bool(clean.index.is_unique),
                    f"{int(clean.index.duplicated().sum())} duplicated dates after cleaning."),
    ]


def check_target(labelled: pd.DataFrame) -> CheckResult:
    """Recompute the label with plain NumPy and compare it row by row."""
    close = labelled["Close"].to_numpy()
    expected = (close[1:] > close[:-1]).astype(float)
    actual = labelled["Target"].to_numpy()[:-1]
    matches = np.array_equal(expected, actual)
    last_is_nan = bool(np.isnan(labelled["Target"].iloc[-1]))
    return CheckResult(
        "target_next_day", "CHECK 3", "Target", "Target equals next-day movement",
        bool(matches and last_is_nan),
        f"Independent recomputation of 1[Close(t+1) > Close(t)] matches all {len(expected)} labels; "
        f"the final row's label is {'undefined (NaN)' if last_is_nan else 'NOT NaN'}.",
    )


def check_last_row_excluded(clean: pd.DataFrame, frame: pd.DataFrame) -> CheckResult:
    last = clean.index.max()
    excluded = last not in frame.index
    return CheckResult(
        "last_row_excluded", "CHECK 4", "Target", "Final unlabeled row excluded",
        bool(excluded),
        f"{last.date()} has no next close and is {'absent from' if excluded else 'PRESENT in'} "
        "the modeling data.",
    )


# ---------------------------------------------------------------------------
# Feature checks
# ---------------------------------------------------------------------------
def _static_violations(module) -> tuple[list[str], int]:
    """Scan a module's code (not its prose) for look-ahead constructs."""
    tree = ast.parse(inspect.getsource(module))
    violations: list[str] = []
    variable_shifts = 0
    for node in ast.walk(tree):
        if not (isinstance(node, ast.Call) and isinstance(node.func, ast.Attribute)):
            continue
        method = node.func.attr
        keywords = {k.arg: k.value for k in node.keywords}
        if method == "shift":
            arg = node.args[0] if node.args else keywords.get("periods")
            if isinstance(arg, ast.UnaryOp) and isinstance(arg.op, ast.USub):
                violations.append(f"negative shift at line {node.lineno}")
            elif isinstance(arg, ast.Constant) and isinstance(arg.value, (int, float)) and arg.value < 0:
                violations.append(f"negative shift at line {node.lineno}")
            elif arg is not None and not isinstance(arg, ast.Constant):
                variable_shifts += 1
        if method in {"bfill", "backfill", "interpolate"}:
            violations.append(f".{method}() at line {node.lineno}")
        if method == "fillna" and isinstance(keywords.get("method"), ast.Constant) \
                and keywords["method"].value in {"bfill", "backfill"}:
            violations.append(f"backward fillna at line {node.lineno}")
        center = keywords.get("center")
        if isinstance(center, ast.Constant) and center.value is True:
            violations.append(f"centred window at line {node.lineno}")
    return violations, variable_shifts


def check_feature_source() -> CheckResult:
    violations: list[str] = []
    variable_shifts = 0
    for module in (features_module, baselines_module):
        found, variable = _static_violations(module)
        violations += [f"{module.__name__}: {v}" for v in found]
        variable_shifts += variable
    return CheckResult(
        "static_code_scan", "CHECK 5", "Features", "No look-ahead constructs in feature code",
        not violations,
        ("Syntax-tree scan of features.py and baselines.py found no negative shift, centred window, "
         "backward fill or interpolation"
         + (f"; {variable_shifts} shift(periods) call(s) take a variable lag, which trailing_return() "
            "restricts to positive values and the truncation test verifies numerically." if variable_shifts else ".")
         if not violations else "; ".join(violations)),
    )


def truncation_test(clean: pd.DataFrame, n_points: int) -> tuple[CheckResult, pd.DataFrame]:
    """Recompute features on histories truncated at date t and compare the values at t.

    If any feature used an observation after t, its value at t would change
    when the future is removed. Returns the check and the per-feature maximum
    absolute difference.
    """
    full = add_technical_features(clean)[ENGINEERED_FEATURES]
    positions = np.unique(np.linspace(60, len(clean) - 2, n_points).astype(int))
    max_diff = pd.Series(0.0, index=ENGINEERED_FEATURES)
    for pos in positions:
        truncated = add_technical_features(clean.iloc[: pos + 1])[ENGINEERED_FEATURES].iloc[-1]
        reference = full.iloc[pos]
        both_nan = truncated.isna() & reference.isna()
        diff = (truncated - reference).abs().where(~both_nan, 0.0)
        # A NaN on one side only is a mismatch as well.
        diff = diff.fillna(np.inf)
        max_diff = np.maximum(max_diff, diff)
    passed = bool((max_diff <= 1e-9).all())
    detail = pd.DataFrame({"feature": ENGINEERED_FEATURES, "max_abs_difference": max_diff.to_numpy()})
    worst = float(max_diff.max())
    return CheckResult(
        "truncation_test", "CHECK 5", "Features", "Features unchanged when the future is removed",
        passed,
        f"All {len(ENGINEERED_FEATURES)} features recomputed on {len(positions)} truncated histories; "
        f"largest absolute difference = {worst:.1e}.",
    ), detail


def check_feature_lists(feature_sets: dict[str, list[str]]) -> CheckResult:
    offending = {name: sorted(set(cols) & FORBIDDEN_FEATURE_COLUMNS) for name, cols in feature_sets.items()}
    offending = {k: v for k, v in offending.items() if v}
    return CheckResult(
        "no_label_in_features", "CHECK 6", "Features", "Target and next-day columns excluded from features",
        not offending,
        "Neither feature set contains Target, Next_Close, Next_Date or the Persistence helper columns."
        if not offending else f"Forbidden columns found: {offending}",
    )


def check_model_inputs(X_train: pd.DataFrame, X_test: pd.DataFrame) -> CheckResult:
    values = np.concatenate([X_train.to_numpy(dtype=float).ravel(), X_test.to_numpy(dtype=float).ravel()])
    finite = bool(np.isfinite(values).all())
    return CheckResult(
        "no_nans", "CHECK 6", "Features", "No NaN or infinite values in model inputs",
        finite,
        f"{X_train.shape[0]} train and {X_test.shape[0]} test rows x {X_train.shape[1]} features are all finite.",
    )


# ---------------------------------------------------------------------------
# Split, preprocessing and validation checks
# ---------------------------------------------------------------------------
def check_split(split: ChronologicalSplit, frame: pd.DataFrame) -> list[CheckResult]:
    train_end, test_start = split.train.index.max(), split.test.index.min()
    label_horizon = pd.Timestamp(split.train["Next_Date"].max())
    order_preserved = (
        split.train.index.is_monotonic_increasing
        and split.test.index.is_monotonic_increasing
        and split.train.index.append(split.embargo.index).append(split.test.index).equals(frame.index)
    )
    return [
        CheckResult("train_before_test", "CHECK 7", "Split", "Train period ends before test period",
                    bool(train_end < test_start),
                    f"max(train date) = {train_end.date()} < min(test date) = {test_start.date()}."),
        CheckResult("labels_resolved", "CHECK 7", "Split", "Every training label resolved before the test window",
                    bool(label_horizon < test_start),
                    f"Latest Close(t+1) used by a training label is from {label_horizon.date()}; "
                    f"{len(split.embargo)} embargo row(s) purged."),
        CheckResult("no_shuffle", "CHECK 8", "Split", "Chronological split, no shuffling",
                    bool(order_preserved),
                    "Train + embargo + test reproduce the original date order exactly; no random split is used."),
    ]


def check_scaler(pipeline: Pipeline, X_train: pd.DataFrame, X_all: pd.DataFrame, name: str) -> CheckResult:
    scaler = pipeline.named_steps["scaler"]
    fitted_on_train = (
        int(scaler.n_samples_seen_) == len(X_train)
        and np.allclose(scaler.mean_, X_train.mean().to_numpy())
        and np.allclose(scaler.scale_, X_train.std(ddof=0).to_numpy())
    )
    close_idx = list(X_train.columns).index("Close")
    return CheckResult(
        f"scaler_{name}", "CHECK 9", "Preprocessing", f"Scaler fitted on training rows only ({name})",
        bool(fitted_on_train),
        f"StandardScaler saw {int(scaler.n_samples_seen_)} rows (= training rows) and its Close mean "
        f"{scaler.mean_[close_idx]:,.1f} equals the training mean, not the train+test mean "
        f"{X_all['Close'].mean():,.1f}.",
    )


def check_cv_folds(cv: TimeSeriesSplit, n_train: int) -> CheckResult:
    ok = True
    for fit_idx, val_idx in cv.split(np.zeros(n_train)):
        ok &= fit_idx.max() + cv.gap < val_idx.min() and val_idx.max() < n_train
    return CheckResult(
        "cv_inside_train", "CHECK 10", "Validation", "Hyper-parameter search never sees the test set",
        bool(ok),
        f"All {cv.n_splits} TimeSeriesSplit folds (gap = {cv.gap}) index only the {n_train} training rows, and "
        "each validation block starts after its fitting block ends.",
    )


# ---------------------------------------------------------------------------
# Baseline and evaluation checks
# ---------------------------------------------------------------------------
def check_majority(majority: int, y_train: pd.Series, y_test: pd.Series) -> CheckResult:
    recomputed = int(y_train.mean() >= 0.5)
    test_majority = int(y_test.mean() >= 0.5)
    return CheckResult(
        "majority_from_train", "CHECK 11", "Baselines", "Majority class taken from training labels",
        bool(majority == recomputed),
        f"Training UP share {y_train.mean():.2%} -> predict {'UP' if majority else 'DOWN'}. "
        f"(The test-set majority, {'UP' if test_majority else 'DOWN'}, was not used.)",
    )


def check_persistence(clean: pd.DataFrame, test: pd.DataFrame, persistence: pd.Series) -> CheckResult:
    """Independent recomputation from the cleaned close series (past data only)."""
    expected = (clean["Close"] > clean["Close"].shift(1)).astype(int).reindex(test.index)
    matches = bool((expected.to_numpy() == persistence.to_numpy()).all())
    uses_future = bool((persistence.to_numpy() == test["Target"].to_numpy()).all())
    return CheckResult(
        "persistence_past_only", "CHECK 12", "Baselines", "Persistence uses only information up to day t",
        matches and not uses_future,
        "Persistence(t) = 1[Close(t) > Close(t-1)] recomputed independently for every test day; it matches "
        f"the realised next-day label on {(persistence == test['Target']).mean():.1%} of days "
        "(a rule that could see tomorrow would match 100%).",
    )


def check_exported_results(results_dir, metrics: dict[str, dict], prediction_columns: dict[str, str]) -> CheckResult:
    """Re-read the exported CSVs from disk and recompute every accuracy from the saved predictions."""
    exported = pd.read_csv(results_dir / "four_way_comparison.csv", index_col="Approach")
    saved = pd.read_csv(results_dir / "test_predictions.csv", index_col="Date")
    ok = True
    for name, column in prediction_columns.items():
        recomputed = float((saved[column] == saved["Actual"]).mean())
        ok &= abs(recomputed - metrics[name]["accuracy"]) < 1e-12
        ok &= abs(float(exported.loc[name, "Accuracy"]) - metrics[name]["accuracy"]) < 1e-6
    return CheckResult(
        "exports_match", "CHECK 14", "Evaluation", "Comparison table reproduces from saved predictions",
        bool(ok),
        "Accuracy in four_way_comparison.csv equals the accuracy recomputed from test_predictions.csv "
        f"for all {len(prediction_columns)} approaches.",
    )


def check_plot_data(plotted: pd.Series, pipeline: Pipeline, X_test: pd.DataFrame) -> CheckResult:
    """The series drawn in the prediction plot must be the model's actual test predictions."""
    fresh = pipeline.predict(X_test)
    ok = plotted.index.equals(X_test.index) and bool((plotted.to_numpy() == fresh).all())
    return CheckResult(
        "plot_uses_test_predictions", "CHECK 15", "Evaluation", "Prediction plot drawn from actual test predictions",
        ok,
        f"The {len(plotted)} predictions plotted equal a fresh pipeline.predict() on the test features, "
        "in chronological order.",
    )


def check_same_window(predictions: dict[str, pd.Series], test_index: pd.DatetimeIndex) -> CheckResult:
    same = all(p.index.equals(test_index) for p in predictions.values())
    return CheckResult(
        "same_test_window", "CHECK 13", "Evaluation", "All four approaches scored on the same test days",
        bool(same),
        f"{', '.join(predictions)} each predict the same {len(test_index)} sessions "
        f"({test_index.min().date()} to {test_index.max().date()}).",
    )
