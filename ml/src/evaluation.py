"""Classification metrics, comparison tables and significance tests.

Positive class convention: UP = 1. Precision, recall and F1 therefore describe
how well an approach identifies UP days. Regression metrics (RMSE, MAE) are
deliberately absent: the task is directional classification, not price
forecasting.
"""

from __future__ import annotations

from math import comb, sqrt
from typing import Any

import numpy as np
import pandas as pd
from sklearn.metrics import (
    accuracy_score,
    balanced_accuracy_score,
    classification_report,
    confusion_matrix,
    f1_score,
    precision_score,
    recall_score,
    roc_auc_score,
)

from . import config

CLASS_NAMES = ["DOWN (0)", "UP (1)"]

LIMITATIONS = [
    "Financial markets are noisy and non-stationary; next-day direction is close to a coin flip "
    "and small accuracy differences can arise by chance.",
    "Relationships learned from 2015-2024 can weaken or reverse in a new regime (policy shocks, "
    "pandemics, changes in market microstructure).",
    "Technical indicators summarise past prices; they carry no guarantee of predictive power.",
    "Raw price levels (Open, High, Low, Close, SMA_20, EMA_20) and MACD in index points are non-stationary: "
    "the test period trades at levels partly outside the training range, which a linear model extrapolates poorly.",
    "One index over one period does not establish that the approach generalises to other assets or markets.",
    "Classification accuracy is not trading profitability: transaction costs, slippage, taxes and "
    "position sizing are not modelled, and no trading strategy was evaluated.",
    "The test window is a single chronological hold-out; results on other windows could differ.",
    "Yahoo Finance data can be revised, and a few sessions lack reported volume; the committed snapshot "
    "and its checksum pin the data used here.",
]


def evaluate_predictions(
    y_true: pd.Series, y_pred: pd.Series, y_score: pd.Series | None = None
) -> dict[str, Any]:
    """Test-set metrics for one approach (positive class = UP)."""
    y_true = np.asarray(y_true, dtype=int)
    y_pred = np.asarray(y_pred, dtype=int)
    tn, fp, fn, tp = confusion_matrix(y_true, y_pred, labels=[0, 1]).ravel()
    correct = int((y_true == y_pred).sum())
    ci_low, ci_high = wilson_interval(correct, len(y_true))
    roc_auc = None
    if y_score is not None and len(np.unique(y_true)) == 2:
        roc_auc = float(roc_auc_score(y_true, np.asarray(y_score, dtype=float)))
    return {
        "accuracy": float(accuracy_score(y_true, y_pred)),
        "accuracy_ci_low": ci_low,
        "accuracy_ci_high": ci_high,
        "precision": float(precision_score(y_true, y_pred, zero_division=0)),
        "recall": float(recall_score(y_true, y_pred, zero_division=0)),
        "f1": float(f1_score(y_true, y_pred, zero_division=0)),
        "balanced_accuracy": float(balanced_accuracy_score(y_true, y_pred)),
        "roc_auc": roc_auc,
        "predicted_up_rate": float(y_pred.mean()),
        "n": int(len(y_true)),
        "correct": correct,
        "confusion": {"tn": int(tn), "fp": int(fp), "fn": int(fn), "tp": int(tp)},
    }


def wilson_interval(successes: int, n: int, z: float = 1.96) -> tuple[float, float]:
    """95% Wilson score interval for a proportion (here: accuracy)."""
    if n == 0:
        return (float("nan"), float("nan"))
    p = successes / n
    denom = 1 + z**2 / n
    centre = (p + z**2 / (2 * n)) / denom
    half = z * sqrt(p * (1 - p) / n + z**2 / (4 * n**2)) / denom
    return (float(centre - half), float(centre + half))


def mcnemar_exact(y_true: pd.Series, pred_a: pd.Series, pred_b: pd.Series) -> dict[str, Any]:
    """Exact (binomial) McNemar test on the paired test-set predictions.

    ``a_only`` counts days that A got right and B got wrong; ``b_only`` the
    reverse. Under H0 (equal accuracy) the discordant days split 50/50.
    """
    y_true = np.asarray(y_true, dtype=int)
    a_right = np.asarray(pred_a, dtype=int) == y_true
    b_right = np.asarray(pred_b, dtype=int) == y_true
    a_only = int((a_right & ~b_right).sum())
    b_only = int((~a_right & b_right).sum())
    n = a_only + b_only
    if n == 0:
        p_value = 1.0
    else:
        k = min(a_only, b_only)
        tail = sum(comb(n, i) for i in range(k + 1)) / 2**n
        p_value = min(1.0, 2 * tail)
    return {"a_only_correct": a_only, "b_only_correct": b_only, "discordant": n, "p_value": float(p_value)}


def comparison_table(results: dict[str, dict[str, Any]]) -> pd.DataFrame:
    """The four-way comparison table (rows in the order given)."""
    rows = []
    for approach, m in results.items():
        rows.append({
            "Approach": approach,
            "Accuracy": m["accuracy"],
            "Precision": m["precision"],
            "Recall": m["recall"],
            "F1": m["f1"],
            "Balanced Accuracy": m["balanced_accuracy"],
            "ROC-AUC": m["roc_auc"] if m["roc_auc"] is not None else np.nan,
            "Predicted UP rate": m["predicted_up_rate"],
            "Test days": m["n"],
        })
    return pd.DataFrame(rows).set_index("Approach")


def class_counts(y: pd.Series) -> dict[str, float]:
    up = int((y == 1).sum())
    down = int((y == 0).sum())
    total = up + down
    return {"up": up, "down": down, "total": total, "up_pct": up / total, "down_pct": down / total}


def describe_balance(up_pct: float) -> str:
    """Label a split as balanced / mildly / meaningfully imbalanced."""
    majority_share = max(up_pct, 1 - up_pct)
    if majority_share <= config.BALANCED_MAX_SHARE:
        return "balanced"
    if majority_share <= config.MILD_IMBALANCE_MAX_SHARE:
        return "mildly imbalanced"
    return "meaningfully imbalanced"


def class_balance_table(y_all: pd.Series, y_train: pd.Series, y_test: pd.Series) -> pd.DataFrame:
    rows = []
    for name, y in (("Overall (usable)", y_all), ("Train", y_train), ("Test", y_test)):
        counts = class_counts(y)
        rows.append({
            "Split": name,
            "UP count": counts["up"],
            "DOWN count": counts["down"],
            "Total": counts["total"],
            "UP %": counts["up_pct"],
            "DOWN %": counts["down_pct"],
            "Assessment": describe_balance(counts["up_pct"]),
        })
    return pd.DataFrame(rows).set_index("Split")


def report_frame(y_true: pd.Series, y_pred: pd.Series) -> pd.DataFrame:
    """scikit-learn classification report as a tidy DataFrame."""
    report = classification_report(
        y_true, y_pred, labels=[0, 1], target_names=CLASS_NAMES, output_dict=True, zero_division=0
    )
    accuracy = report.pop("accuracy")
    frame = pd.DataFrame(report).T
    # The accuracy row has no per-class precision/recall; its support is every test day.
    frame.loc["accuracy"] = [np.nan, np.nan, accuracy, frame.loc["macro avg", "support"]]
    frame = frame.loc[[*CLASS_NAMES, "accuracy", "macro avg", "weighted avg"]]
    frame["support"] = frame["support"].astype(int)
    return frame


def rolling_accuracy(y_true: pd.Series, y_pred: pd.Series, window: int) -> pd.Series:
    """Trailing accuracy over ``window`` test sessions (diagnostic only)."""
    correct = (pd.Series(np.asarray(y_true), index=y_true.index) == np.asarray(y_pred)).astype(float)
    return correct.rolling(window=window, min_periods=window).mean()


def answer_research_questions(
    metrics: dict[str, dict[str, Any]],
    significance: dict[str, dict[str, Any]],
    balance: pd.DataFrame,
) -> list[dict[str, str]]:
    """Evidence-based answers to the assignment's interpretation questions.

    Every sentence is derived from the numbers passed in; nothing is asserted
    that the metrics do not show.
    """
    acc = {k: v["accuracy"] for k, v in metrics.items()}
    pp = lambda a, b: 100 * (acc[a] - acc[b])  # noqa: E731
    fmt = lambda x: f"{x:+.2f} pp"  # noqa: E731

    def beat(a: str, b: str) -> str:
        return "Yes" if acc[a] > acc[b] else ("Tie" if acc[a] == acc[b] else "No")

    best_baseline = max(("Persistence", "Majority Class"), key=lambda k: acc[k])
    eng_vs_best = pp("Engineered Features", best_baseline)
    sig_best = significance[f"Engineered Features vs {best_baseline}"]
    sig_raw = significance["Engineered Features vs Raw OHLCV"]
    meaningful = (
        eng_vs_best >= config.MEANINGFUL_IMPROVEMENT_PP and sig_best["p_value"] < config.ALPHA
    )
    test_up = balance.loc["Test", "UP %"]
    train_up = balance.loc["Train", "UP %"]
    eng = metrics["Engineered Features"]
    raw = metrics["Raw OHLCV"]
    close_to_naive = (
        abs(pp("Engineered Features", "Majority Class")) < config.MEANINGFUL_IMPROVEMENT_PP
        or eng["predicted_up_rate"] > 0.9
        or eng["predicted_up_rate"] < 0.1
    )

    return [
        {
            "question": "Did the raw model beat Persistence?",
            "verdict": beat("Raw OHLCV", "Persistence"),
            "answer": f"Raw OHLCV accuracy {acc['Raw OHLCV']:.2%} vs Persistence "
                      f"{acc['Persistence']:.2%} ({fmt(pp('Raw OHLCV', 'Persistence'))}).",
        },
        {
            "question": "Did the raw model beat Majority Class?",
            "verdict": beat("Raw OHLCV", "Majority Class"),
            "answer": f"Raw OHLCV accuracy {acc['Raw OHLCV']:.2%} vs Majority "
                      f"{acc['Majority Class']:.2%} ({fmt(pp('Raw OHLCV', 'Majority Class'))}). "
                      f"The raw model predicted UP on {raw['predicted_up_rate']:.1%} of test days.",
        },
        {
            "question": "Did the engineered model beat the raw model?",
            "verdict": beat("Engineered Features", "Raw OHLCV"),
            "answer": f"Engineered {acc['Engineered Features']:.2%} vs Raw {acc['Raw OHLCV']:.2%} "
                      f"({fmt(pp('Engineered Features', 'Raw OHLCV'))}); exact McNemar p = "
                      f"{sig_raw['p_value']:.3f} on {sig_raw['discordant']} discordant days.",
        },
        {
            "question": "Did the engineered model beat both naive baselines?",
            "verdict": "Yes" if acc["Engineered Features"] > max(acc["Persistence"], acc["Majority Class"]) else "No",
            "answer": f"vs Persistence {fmt(pp('Engineered Features', 'Persistence'))}; "
                      f"vs Majority {fmt(pp('Engineered Features', 'Majority Class'))}.",
        },
        {
            "question": "By how much?",
            "verdict": fmt(eng_vs_best),
            "answer": f"Against the stronger baseline ({best_baseline}) the engineered model differs by "
                      f"{fmt(eng_vs_best)}. Its 95% Wilson interval for accuracy is "
                      f"{eng['accuracy_ci_low']:.1%} to {eng['accuracy_ci_high']:.1%}.",
        },
        {
            "question": "Is the improvement practically meaningful or only marginal?",
            "verdict": "Meaningful" if meaningful else "Marginal / not established",
            "answer": (
                f"The difference to {best_baseline} is {fmt(eng_vs_best)} with exact McNemar "
                f"p = {sig_best['p_value']:.3f}. The project's pre-set bar for 'meaningful' is at least "
                f"{config.MEANINGFUL_IMPROVEMENT_PP:.0f} pp AND p < {config.ALPHA}; "
                + ("both conditions are met." if meaningful else "this bar is not met.")
            ),
        },
        {
            "question": "How does class imbalance affect interpretation?",
            "verdict": describe_balance(test_up).capitalize(),
            "answer": f"UP days are {train_up:.1%} of training labels and {test_up:.1%} of test labels, so "
                      f"always predicting '{'UP' if train_up >= 0.5 else 'DOWN'}' already scores "
                      f"{acc['Majority Class']:.2%}. Accuracy must be read relative to that floor; "
                      f"balanced accuracy (Engineered {eng['balanced_accuracy']:.2%}, Raw "
                      f"{raw['balanced_accuracy']:.2%}) removes the advantage of favouring the majority class.",
        },
        {
            "question": "Are there signs that the model is close to naive performance?",
            "verdict": "Yes" if close_to_naive else "No",
            "answer": f"The engineered model is {fmt(pp('Engineered Features', 'Majority Class'))} from the "
                      f"Majority baseline, predicts UP on {eng['predicted_up_rate']:.1%} of days and has "
                      f"ROC-AUC {eng['roc_auc']:.3f} (0.5 = no ranking skill).",
        },
    ]
