"""Naive baselines every model must beat.

Persistence  - "tomorrow matches today":
               prediction_t = 1 if Close_t > Close_(t-1) else 0.
               Uses only information available at the close of day t.
Majority     - always predict the class that is most frequent in the TRAINING
               labels (ties resolve to UP). The test set is never consulted.
"""

from __future__ import annotations

import pandas as pd


def persistence_predictions(frame: pd.DataFrame) -> pd.Series:
    """Predict tomorrow's direction as today's realised direction."""
    return frame["Today_Direction"].astype(int).rename("Persistence")


def majority_class(y_train: pd.Series) -> tuple[int, dict[str, float]]:
    """Dominant class of the training labels, plus the counts it was based on."""
    up = int((y_train == 1).sum())
    down = int((y_train == 0).sum())
    total = up + down
    majority = 1 if up >= down else 0
    summary = {
        "up": up,
        "down": down,
        "total": total,
        "up_pct": up / total,
        "down_pct": down / total,
        "majority_class": majority,
    }
    return majority, summary


def majority_predictions(index: pd.Index, majority: int) -> pd.Series:
    """Constant prediction of the training-set majority class."""
    return pd.Series(majority, index=index, name="Majority", dtype=int)
