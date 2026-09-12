"""Matplotlib figures used in the notebook and saved to ``results/``.

Colour roles: UP = green, DOWN = red (always paired with position, a glyph or
a text label, never colour alone); the two baselines are neutral greys; the
raw and engineered models use an orange / indigo pair that stays separable
under red-green colour-vision deficiency.
"""

from __future__ import annotations

from pathlib import Path

import matplotlib.dates as mdates
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
from matplotlib.ticker import FuncFormatter, PercentFormatter

INK = "#0f172a"
INK_2 = "#475569"
MUTED = "#64748b"
GRID = "#e2e8f0"
SURFACE = "#ffffff"
UP = "#16a34a"
DOWN = "#dc2626"
APPROACH_COLORS = {
    "Persistence": "#94a3b8",
    "Majority Class": "#64748b",
    "Raw OHLCV": "#eb6834",
    "Engineered Features": "#4f46e5",
}
TRAIN_SHADE = "#eef2ff"
TEST_SHADE = "#fff1e6"


def apply_style() -> None:
    """Quiet, report-style defaults shared by every figure."""
    plt.rcParams.update({
        "figure.facecolor": SURFACE,
        "axes.facecolor": SURFACE,
        "savefig.facecolor": SURFACE,
        "axes.edgecolor": "#cbd5e1",
        "axes.labelcolor": INK_2,
        "axes.titlecolor": INK,
        "axes.titleweight": "semibold",
        "axes.titlesize": 12,
        "axes.titlelocation": "left",
        "axes.labelsize": 10,
        "axes.spines.top": False,
        "axes.spines.right": False,
        "axes.grid": True,
        "grid.color": GRID,
        "grid.linewidth": 0.8,
        "xtick.color": MUTED,
        "ytick.color": MUTED,
        "xtick.labelsize": 9,
        "ytick.labelsize": 9,
        "legend.frameon": False,
        "legend.fontsize": 9,
        "font.size": 10,
        "figure.dpi": 110,
        "savefig.dpi": 160,
        "savefig.bbox": "tight",
    })


def save_figure(fig: plt.Figure, path: Path) -> Path:
    path.parent.mkdir(parents=True, exist_ok=True)
    fig.savefig(path)
    return path


def _thousands(value: float, _pos: int) -> str:
    return f"{value:,.0f}"


def plot_train_test_split(close: pd.Series, train: pd.DataFrame, embargo: pd.DataFrame,
                          test: pd.DataFrame) -> plt.Figure:
    fig, ax = plt.subplots(figsize=(12, 4))
    ax.axvspan(train.index.min(), train.index.max(), color=TRAIN_SHADE, lw=0,
               label=f"Train: {train.index.min():%d %b %Y} to {train.index.max():%d %b %Y} ({len(train):,} sessions)")
    ax.axvspan(test.index.min(), test.index.max(), color=TEST_SHADE, lw=0,
               label=f"Test: {test.index.min():%d %b %Y} to {test.index.max():%d %b %Y} ({len(test):,} sessions)")
    ax.plot(close.index, close.to_numpy(), color=INK, lw=1.1, label="NIFTY 50 close")
    ax.axvline(test.index.min(), color=INK_2, lw=1)
    ax.set_title("NIFTY 50 daily close with the chronological train / test split "
                 f"({len(embargo)} embargo session purged at the boundary)")
    ax.set_ylabel("Index level")
    ax.yaxis.set_major_formatter(FuncFormatter(_thousands))
    ax.xaxis.set_major_locator(mdates.YearLocator())
    ax.xaxis.set_major_formatter(mdates.DateFormatter("%Y"))
    ax.set_xlim(close.index.min(), close.index.max())
    ax.legend(loc="upper left")
    return fig


def plot_class_balance(balance: pd.DataFrame) -> plt.Figure:
    """100% stacked bars of UP / DOWN share for each partition."""
    fig, ax = plt.subplots(figsize=(10, 3.2))
    rows = balance.iloc[::-1]
    y = np.arange(len(rows))
    up, down = rows["UP %"].to_numpy(), rows["DOWN %"].to_numpy()
    ax.barh(y, up, color=UP, height=0.52, label="UP (1)")
    ax.barh(y, down, left=up + 0.004, color=DOWN, height=0.52, label="DOWN (0)")
    for i, (u, d) in enumerate(zip(up, down)):
        ax.text(u / 2, i, f"▲ UP {u:.1%}", ha="center", va="center", color="white",
                fontsize=9, fontweight="semibold")
        ax.text(u + d / 2, i, f"▼ DOWN {d:.1%}", ha="center", va="center", color="white",
                fontsize=9, fontweight="semibold")
    ax.axvline(0.5, color=INK, lw=1)
    ax.set_yticks(y, [f"{name}\nn = {int(total):,}" for name, total in zip(rows.index, rows["Total"])])
    ax.set_xlim(0, 1.004)
    ax.xaxis.set_major_formatter(PercentFormatter(1.0))
    ax.grid(False)
    ax.set_title("Class balance of the next-day target (vertical line = 50%)")
    ax.legend(loc="lower center", bbox_to_anchor=(0.5, -0.42), ncol=2)
    return fig


def plot_four_way_comparison(metrics: dict[str, dict], majority_accuracy: float) -> plt.Figure:
    """Test accuracy with 95% Wilson intervals: a dot plot, so no truncated bars."""
    names = list(metrics)
    fig, ax = plt.subplots(figsize=(10, 3.8))
    for i, name in enumerate(names[::-1]):
        m = metrics[name]
        ax.errorbar(m["accuracy"], i, xerr=[[m["accuracy"] - m["accuracy_ci_low"]],
                                           [m["accuracy_ci_high"] - m["accuracy"]]],
                    fmt="o", color=APPROACH_COLORS[name], ecolor=APPROACH_COLORS[name],
                    elinewidth=2, capsize=5, markersize=9, markeredgecolor=SURFACE, markeredgewidth=1.5)
        ax.text(m["accuracy_ci_high"] + 0.004, i, f"{m['accuracy']:.2%}", va="center",
                fontsize=10, fontweight="semibold", color=INK)
    ax.axvline(0.5, color=MUTED, lw=1)
    ax.axvline(majority_accuracy, color=APPROACH_COLORS["Majority Class"], lw=1)
    ax.text(0.5, len(names) - 0.45, "coin flip", ha="center", fontsize=8, color=MUTED)
    ax.text(majority_accuracy, len(names) - 0.45, "majority baseline", ha="center", fontsize=8, color=MUTED)
    ax.set_yticks(range(len(names)), names[::-1])
    ax.set_ylim(-0.6, len(names) - 0.2)
    lows = [metrics[n]["accuracy_ci_low"] for n in names]
    highs = [metrics[n]["accuracy_ci_high"] for n in names]
    ax.set_xlim(min(0.45, min(lows) - 0.02), max(highs) + 0.05)
    ax.xaxis.set_major_formatter(PercentFormatter(1.0, decimals=0))
    ax.set_xlabel("Test-set directional accuracy (point estimate and 95% Wilson interval)")
    ax.set_title("Four-way comparison on the untouched test window")
    return fig


def plot_confusion_matrices(metrics: dict[str, dict]) -> plt.Figure:
    names = list(metrics)
    fig, axes = plt.subplots(1, len(names), figsize=(4 * len(names), 3.8))
    for ax, name in zip(np.atleast_1d(axes), names):
        c = metrics[name]["confusion"]
        matrix = np.array([[c["tn"], c["fp"]], [c["fn"], c["tp"]]])
        row_share = matrix / matrix.sum(axis=1, keepdims=True).clip(min=1)
        ax.imshow(row_share, cmap="Blues", vmin=0, vmax=1)
        for (r, col), value in np.ndenumerate(matrix):
            share = row_share[r, col]
            ax.text(col, r, f"{value}\n{share:.0%} of row", ha="center", va="center", fontsize=10,
                    color="white" if share > 0.55 else INK)
        ax.set_xticks([0, 1], ["DOWN", "UP"])
        ax.set_yticks([0, 1], ["DOWN", "UP"])
        ax.set_xlabel("Predicted")
        ax.set_ylabel("Actual")
        ax.grid(False)
        ax.set_title(name, fontsize=11)
    fig.suptitle("Confusion matrices on the test window (rows = actual class)", x=0.01, ha="left",
                 fontsize=12, fontweight="semibold", color=INK)
    fig.tight_layout()
    return fig


def plot_actual_vs_predicted(
    predictions: pd.DataFrame,
    pred_col: str,
    prob_col: str,
    label: str,
    rolling: pd.Series,
    window: int,
    majority_accuracy: float,
) -> plt.Figure:
    """Required figure: actual vs predicted direction across the whole test window."""
    color = APPROACH_COLORS[label]
    dates = predictions.index
    fig, axes = plt.subplots(3, 1, figsize=(14, 9.5), sharex=True,
                             gridspec_kw={"height_ratios": [2.2, 1.2, 1.2], "hspace": 0.28})

    ax = axes[0]
    actual = predictions["Actual"].to_numpy()
    predicted = predictions[pred_col].to_numpy()
    wrong = actual != predicted
    ax.scatter(dates, actual + 0.12, s=14, color=INK, label="Actual direction", zorder=3)
    ax.scatter(dates[~wrong], predicted[~wrong] - 0.12, s=36, marker="|", color=color,
               label="Predicted direction (correct)", zorder=3)
    ax.scatter(dates[wrong], predicted[wrong] - 0.12, s=36, marker="x", color=DOWN,
               label="Predicted direction (wrong)", zorder=3, linewidths=1)
    ax.set_yticks([0, 1], ["DOWN (0)", "UP (1)"])
    ax.set_ylim(-0.45, 1.45)
    ax.set_ylabel("Next-day direction")
    ax.set_title(f"Actual vs predicted next-day direction — {label} model, "
                 f"test window {dates.min():%d %b %Y} to {dates.max():%d %b %Y} "
                 f"({len(dates)} sessions, {(~wrong).mean():.1%} correct)")
    ax.legend(loc="upper center", bbox_to_anchor=(0.5, -0.04), ncol=3)
    ax.grid(axis="x", visible=False)

    ax = axes[1]
    ax.plot(dates, predictions[prob_col].to_numpy(), color=color, lw=1.2)
    ax.axhline(0.5, color=INK_2, lw=1)
    ax.set_ylabel("P(UP)")
    ax.yaxis.set_major_formatter(PercentFormatter(1.0, decimals=0))
    ax.set_title("Predicted probability of UP (decision threshold 50%)", fontsize=10)

    ax = axes[2]
    ax.plot(rolling.index, rolling.to_numpy(), color=color, lw=1.6, label=f"{label}: {window}-session accuracy")
    ax.axhline(majority_accuracy, color=APPROACH_COLORS["Majority Class"], lw=1,
               label=f"Majority baseline (full test window) {majority_accuracy:.1%}")
    ax.axhline(0.5, color=MUTED, lw=0.8, label="50%")
    ax.set_ylabel("Rolling accuracy")
    ax.yaxis.set_major_formatter(PercentFormatter(1.0, decimals=0))
    ax.set_title(f"Trailing {window}-session accuracy (diagnostic)", fontsize=10)
    ax.legend(loc="lower left", ncol=3)
    ax.xaxis.set_major_locator(mdates.MonthLocator(interval=2))
    ax.xaxis.set_major_formatter(mdates.DateFormatter("%b %Y"))
    ax.set_xlabel("Date (chronological test window)")
    return fig


def plot_coefficients(coefficients: pd.Series, title: str) -> plt.Figure:
    ordered = coefficients.sort_values()
    fig, ax = plt.subplots(figsize=(9, 0.42 * len(ordered) + 1.4))
    colors = [UP if v > 0 else DOWN for v in ordered]
    ax.barh(ordered.index, ordered.to_numpy(), color=colors, height=0.55)
    for i, value in enumerate(ordered):
        ax.text(value + (0.004 if value >= 0 else -0.004), i, f"{value:+.3f}",
                va="center", ha="left" if value >= 0 else "right", fontsize=8.5, color=INK)
    span = max(abs(ordered.min()), abs(ordered.max()), 1e-6)
    ax.set_xlim(-span * 1.35, span * 1.35)
    ax.axvline(0, color=INK, lw=1)
    ax.set_xlabel("← lowers P(UP)   |   coefficient on standardised feature (log-odds per 1 s.d.)   |   raises P(UP) →")
    ax.set_title(title)
    ax.grid(axis="y", visible=False)
    return fig


def plot_cv_curves(cv_tables: dict[str, pd.DataFrame], best_c: dict[str, float]) -> plt.Figure:
    fig, ax = plt.subplots(figsize=(9, 4))
    for label, table in cv_tables.items():
        color = APPROACH_COLORS[label]
        mean = table["mean_validation_accuracy"].to_numpy()
        std = table["std_validation_accuracy"].to_numpy()
        ax.plot(table["C"], mean, marker="o", color=color, lw=2, label=f"{label} (selected C = {best_c[label]:g})")
        ax.fill_between(table["C"], mean - std, mean + std, color=color, alpha=0.1, lw=0)
    ax.set_xscale("log")
    ax.yaxis.set_major_formatter(PercentFormatter(1.0, decimals=0))
    ax.set_xlabel("Inverse regularisation strength C (log scale)")
    ax.set_ylabel("Mean validation accuracy")
    ax.set_title("Forward-chaining cross-validation inside the training period (band = ±1 s.d. across folds)")
    ax.legend(loc="lower right")
    return fig
