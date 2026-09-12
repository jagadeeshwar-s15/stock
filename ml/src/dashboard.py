"""Serialise the executed experiment into the JSON contract read by the web dashboard.

The dashboard never recomputes a metric: it renders exactly what the notebook
produced. Increase ``SCHEMA_VERSION`` whenever the structure below changes and
update ``lib/dashboard-types.ts`` in the web app accordingly.
"""

from __future__ import annotations

import json
import math
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import pandas as pd

from . import config
from .evaluation import LIMITATIONS
from .features import (
    DERIVED_FEATURES,
    ENGINEERED_FEATURES,
    FEATURE_DEFINITIONS,
    RAW_FEATURES,
    TECHNICAL_INDICATORS,
)
from .leakage import CheckResult
from .models import TunedModel
from .split import ChronologicalSplit

SCHEMA_VERSION = 1

APPROACHES = [
    ("persistence", "Persistence", "baseline"),
    ("majority", "Majority Class", "baseline"),
    ("raw", "Raw OHLCV", "model"),
    ("engineered", "Engineered Features", "model"),
]
MODEL_KEYS = {"Raw OHLCV": "raw", "Engineered Features": "engineered"}

# Display precision per column (the CSV exports keep full precision).
DIGITS = {
    "Open": 2, "High": 2, "Low": 2, "Close": 2, "Volume": 0, "SMA_20": 2, "EMA_20": 2,
    "RSI_14": 2, "MACD": 2, "MACD_Signal": 2, "MACD_Hist": 2, "Rolling_Volatility_20": 5,
    "Return_5D": 5, "Volume_Change": 4, "Next_Close": 2, "Prev_Close": 2,
}
INDICATOR_KEYS = {
    "close": "Close", "volume": "Volume", "sma20": "SMA_20", "ema20": "EMA_20", "rsi14": "RSI_14",
    "macd": "MACD", "macdSignal": "MACD_Signal", "macdHist": "MACD_Hist",
    "volatility20": "Rolling_Volatility_20", "return5d": "Return_5D", "volumeChange": "Volume_Change",
}


def _num(value: Any, digits: int | None = None) -> float | None:
    if value is None:
        return None
    try:
        number = float(value)
    except (TypeError, ValueError):
        return None
    if math.isnan(number) or math.isinf(number):
        return None
    return round(number, digits) if digits is not None else number


def _day(value: Any) -> str | None:
    if value is None or value is pd.NaT:
        return None
    if isinstance(value, float) and math.isnan(value):
        return None
    return pd.Timestamp(value).strftime("%Y-%m-%d")


def _range(part: pd.DataFrame) -> dict[str, Any]:
    return {"start": _day(part.index.min()), "end": _day(part.index.max()), "rows": int(len(part))}


def _ohlcv_rows(frame: pd.DataFrame) -> list[dict[str, Any]]:
    return [
        {"date": _day(idx), **{col.lower(): _num(row[col], DIGITS[col]) for col in RAW_FEATURES}}
        for idx, row in frame.iterrows()
    ]


def _feature_rows(frame: pd.DataFrame, columns: list[str], partition: str | None = None) -> list[dict[str, Any]]:
    rows = []
    for idx, row in frame.iterrows():
        record: dict[str, Any] = {"Date": _day(idx)}
        if partition is not None:
            record["Partition"] = partition
        for col in columns:
            if col == "Next_Date":
                record[col] = _day(row[col])
            elif col == "Target":
                record[col] = int(row[col])
            else:
                record[col] = _num(row[col], DIGITS.get(col))
        rows.append(record)
    return rows


def build_payload(
    *,
    metadata: dict[str, Any],
    cleaning: dict[str, Any],
    clean: pd.DataFrame,
    labelled: pd.DataFrame,
    frame: pd.DataFrame,
    exclusions: dict[str, int],
    unchanged_closes: int,
    split: ChronologicalSplit,
    balance: pd.DataFrame,
    majority_class: int,
    majority_summary: dict[str, Any],
    tuned: dict[str, TunedModel],
    folds: pd.DataFrame,
    cv_description: str,
    metrics: dict[str, dict[str, Any]],
    significance: dict[str, dict[str, Any]],
    reports: dict[str, pd.DataFrame],
    predictions: pd.DataFrame,
    rolling: pd.DataFrame,
    checks: list[CheckResult],
    truncation: pd.DataFrame,
    truncation_points: int,
    answers: list[dict[str, str]],
    next_session: dict[str, Any] | None,
    environment: dict[str, str],
    artifacts: list[dict[str, str]],
) -> dict[str, Any]:
    """Assemble every number the dashboard displays into one JSON-ready dict."""
    last, previous = clean.iloc[-1], clean.iloc[-2]
    label_columns = ENGINEERED_FEATURES + ["Next_Date", "Next_Close", "Target"]
    approach_rows = []
    for key, label, kind in APPROACHES:
        m = metrics[label]
        approach_rows.append({
            "key": key, "label": label, "kind": kind,
            "accuracy": m["accuracy"], "accuracyCiLow": m["accuracy_ci_low"], "accuracyCiHigh": m["accuracy_ci_high"],
            "precision": m["precision"], "recall": m["recall"], "f1": m["f1"],
            "balancedAccuracy": m["balanced_accuracy"], "rocAuc": _num(m["roc_auc"]),
            "predictedUpRate": m["predicted_up_rate"], "n": m["n"], "correct": m["correct"],
            "confusion": m["confusion"],
        })
    best = max(approach_rows, key=lambda row: row["accuracy"])  # ties resolve to the earlier (baseline) row

    return {
        "schemaVersion": SCHEMA_VERSION,
        "generatedAt": datetime.now(timezone.utc).replace(microsecond=0).isoformat(),
        "project": {
            "title": "Stock Price Movement Predictor",
            "track": "Time-Series Machine Learning",
            "objective": "Predict the next trading day's direction (UP = 1, DOWN = 0) of the NIFTY 50 index "
                         "from daily OHLCV data, without temporal leakage.",
            "positiveClass": "UP (1)",
        },
        "dataset": {
            "name": config.DATASET_NAME,
            "ticker": config.TICKER,
            "source": metadata.get("source", config.DATA_SOURCE),
            "accessLibrary": metadata.get("access_library", config.DATA_ACCESS_LIBRARY),
            "frequency": config.FREQUENCY,
            "requestedStart": config.START_DATE,
            "requestedEndExclusive": config.END_DATE,
            "retrievedAtUtc": metadata.get("retrieved_at_utc"),
            "sha256": metadata.get("sha256"),
            "firstDate": _day(clean.index.min()),
            "lastDate": _day(clean.index.max()),
            "rawRows": cleaning["raw_rows"],
            "cleanRows": cleaning["clean_rows"],
            "usableRows": int(len(frame)),
            "columns": cleaning["raw_columns"],
        },
        "cleaning": {
            "inputWasSorted": cleaning["input_was_sorted"],
            "unparseableDatesRemoved": cleaning["unparseable_dates_removed"],
            "duplicateDatesRemoved": cleaning["duplicate_dates_removed"],
            "incompleteRowsRemoved": cleaning["incomplete_rows_removed"],
            "impossibleRowsRemoved": cleaning["impossible_rows_removed"],
            "volumeUnavailableRows": cleaning["volume_unavailable_rows"],
            "volumeUnavailableDates": cleaning["volume_unavailable_dates"],
            "highBelowOpenOrClose": cleaning["high_below_open_or_close"],
            "lowAboveOpenOrClose": cleaning["low_above_open_or_close"],
            "missingValues": cleaning["missing_values"],
            "nonNumericValuesCoerced": cleaning["non_numeric_values_coerced"],
            "modelingExclusions": {
                "warmupRows": exclusions["warmup_rows"],
                "undefinedFeatureRowsAfterWarmup": exclusions["undefined_feature_rows_after_warmup"],
                "unlabelledFinalRows": exclusions["unlabelled_final_rows"],
            },
        },
        "latest": {
            "date": _day(clean.index[-1]),
            "open": _num(last["Open"], 2), "high": _num(last["High"], 2), "low": _num(last["Low"], 2),
            "close": _num(last["Close"], 2), "volume": _num(last["Volume"], 0),
            "prevDate": _day(clean.index[-2]), "prevClose": _num(previous["Close"], 2),
            "change": _num(last["Close"] - previous["Close"], 2),
            "changePct": _num(last["Close"] / previous["Close"] - 1, 6),
        },
        "priceHistory": [{"d": _day(i), "c": _num(v, 2)} for i, v in clean["Close"].items()],
        "ohlcvPreview": {"head": _ohlcv_rows(clean.head(5)), "tail": _ohlcv_rows(clean.tail(5))},
        "target": {
            "formula": "Target_t = 1 if Close_(t+1) > Close_t, else 0",
            "code": 'next_close = df["Close"].shift(-1)\n'
                    'df["Target"] = np.where(next_close.isna(), np.nan,\n'
                    '                        (next_close > df["Close"]).astype(float))',
            "positiveLabel": "UP (1): the next session closes higher",
            "negativeLabel": "DOWN (0): the next session closes lower or unchanged",
            "unchangedCloses": unchanged_closes,
            "finalRow": {"date": _day(labelled.index[-1]), "close": _num(labelled["Close"].iloc[-1], 2)},
        },
        "leakageTable": {
            "columns": ["Date", "Partition", *label_columns],
            "featureColumns": ENGINEERED_FEATURES,
            "labelColumns": ["Next_Date", "Next_Close", "Target"],
            "rows": (
                _feature_rows(split.train.tail(3), label_columns, "Train")
                + _feature_rows(split.embargo, label_columns, "Embargo")
                + _feature_rows(split.test.head(4), label_columns, "Test")
            ),
        },
        "leakageChecks": [
            {"id": c.id, "ref": c.ref, "stage": c.stage, "name": c.name, "passed": bool(c.passed), "detail": c.detail}
            for c in checks
        ],
        "truncationTest": {
            "cutPoints": truncation_points,
            "features": [{"name": r.feature, "maxAbsDiff": float(r.max_abs_difference)} for r in truncation.itertuples()],
        },
        "classBalance": {
            "splits": [
                {
                    "key": key, "label": label,
                    "up": int(balance.loc[label, "UP count"]), "down": int(balance.loc[label, "DOWN count"]),
                    "total": int(balance.loc[label, "Total"]),
                    "upPct": float(balance.loc[label, "UP %"]), "downPct": float(balance.loc[label, "DOWN %"]),
                    "assessment": balance.loc[label, "Assessment"],
                }
                for key, label in (("overall", "Overall (usable)"), ("train", "Train"), ("test", "Test"))
            ],
        },
        "features": {
            "raw": RAW_FEATURES,
            "technical": TECHNICAL_INDICATORS,
            "derived": DERIVED_FEATURES,
            "engineered": ENGINEERED_FEATURES,
            "definitions": FEATURE_DEFINITIONS,
        },
        "featurePreview": {
            "columns": ["Date", *ENGINEERED_FEATURES, "Target"],
            "rows": _feature_rows(frame.tail(8), ENGINEERED_FEATURES + ["Target"]),
        },
        "indicatorSeries": [
            {"d": _day(idx), **{key: _num(row[col], DIGITS[col]) for key, col in INDICATOR_KEYS.items()}}
            for idx, row in labelled.tail(250).iterrows()
        ],
        "split": {
            "method": f"Chronological {1 - config.TEST_FRACTION:.0%} / {config.TEST_FRACTION:.0%} hold-out "
                      f"with a {config.EMBARGO_ROWS}-session embargo",
            "testFraction": config.TEST_FRACTION,
            "embargoRows": config.EMBARGO_ROWS,
            "train": _range(split.train),
            "embargo": _range(split.embargo),
            "test": _range(split.test),
        },
        "cv": {
            "method": cv_description,
            "scoring": config.TUNING_METRIC,
            "grid": config.C_GRID,
            "folds": [
                {
                    "fold": int(fold), "fitStart": _day(r.fit_start), "fitEnd": _day(r.fit_end),
                    "validationStart": _day(r.validation_start), "validationEnd": _day(r.validation_end),
                    "fitRows": int(r.fit_rows), "validationRows": int(r.validation_rows),
                }
                for fold, r in folds.iterrows()
            ],
            "models": [
                {
                    "key": MODEL_KEYS[label], "label": label, "bestC": model.best_C,
                    "results": [
                        {
                            "C": float(r["C"]),
                            "meanValidationAccuracy": float(r["mean_validation_accuracy"]),
                            "stdValidationAccuracy": float(r["std_validation_accuracy"]),
                            "meanTrainAccuracy": float(r["mean_train_accuracy"]),
                            "rank": int(r["rank"]),
                            "folds": [float(r[c]) for c in model.cv_results.columns if c.startswith("fold_")],
                        }
                        for _, r in model.cv_results.iterrows()
                    ],
                }
                for label, model in tuned.items()
            ],
        },
        "model": {
            "algorithm": "Logistic Regression",
            "pipeline": "Pipeline(StandardScaler -> LogisticRegression)",
            "solver": "lbfgs (L2 penalty)",
            "maxIter": config.MAX_ITER,
            "randomState": config.RANDOM_STATE,
        },
        "results": {
            "approaches": approach_rows,
            "bestApproach": best["key"],
            "majorityClass": int(majority_class),
            "majorityTraining": {
                "up": majority_summary["up"], "down": majority_summary["down"], "total": majority_summary["total"],
                "upPct": majority_summary["up_pct"], "downPct": majority_summary["down_pct"],
            },
            "significance": [
                {"comparison": name, "aOnlyCorrect": s["a_only_correct"], "bOnlyCorrect": s["b_only_correct"],
                 "discordant": s["discordant"], "pValue": s["p_value"]}
                for name, s in significance.items()
            ],
        },
        "classificationReports": [
            {
                "key": MODEL_KEYS[label], "label": label,
                "rows": [
                    {"label": str(idx), "precision": _num(r["precision"]), "recall": _num(r["recall"]),
                     "f1": _num(r["f1-score"]), "support": int(r["support"])}
                    for idx, r in report.iterrows()
                ],
            }
            for label, report in reports.items()
        ],
        "coefficients": [
            {
                "key": MODEL_KEYS[label], "label": label, "intercept": model.intercept(),
                "values": [{"feature": f, "coef": float(v)} for f, v in model.coefficients().items()],
            }
            for label, model in tuned.items()
        ],
        "predictions": [
            {
                "d": _day(idx), "actual": int(r["Actual"]), "persistence": int(r["Persistence"]),
                "majority": int(r["Majority"]), "raw": int(r["Raw_Pred"]), "rawProb": _num(r["Raw_Prob_Up"], 4),
                "engineered": int(r["Engineered_Pred"]), "engineeredProb": _num(r["Engineered_Prob_Up"], 4),
            }
            for idx, r in predictions.iterrows()
        ],
        "rollingAccuracy": {
            "window": config.ROLLING_ACCURACY_WINDOW,
            "points": [
                {"d": _day(idx), **{col.lower(): _num(r[col], 4) for col in rolling.columns}}
                for idx, r in rolling.iterrows()
            ],
        },
        "nextSession": next_session,
        "findings": answers,
        "limitations": LIMITATIONS,
        "artifacts": artifacts,
        "environment": environment,
    }


def write_payload(payload: dict[str, Any], path: Path = config.DASHBOARD_FILE) -> Path:
    """Write compact JSON; NaN/inf are rejected so the file is always valid JSON."""
    path.parent.mkdir(parents=True, exist_ok=True)
    text = json.dumps(payload, ensure_ascii=False, allow_nan=False, separators=(",", ":"))
    path.write_text(text + "\n", encoding="utf-8")
    return path
