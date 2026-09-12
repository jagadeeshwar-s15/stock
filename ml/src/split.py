"""Chronological train/test split with a one-row embargo.

    OLD --------------------------------------------------> NEW
    [ TRAIN ................................ ][E][ TEST ....... ]

The label of the last row before the test window is computed from the close
of the first test day. Purging that single row (the embargo ``E``) guarantees
that every training label is fully resolved before the test window starts, so
no training example contains information from the test period.
"""

from __future__ import annotations

from dataclasses import dataclass

import pandas as pd


@dataclass(frozen=True)
class ChronologicalSplit:
    train: pd.DataFrame
    embargo: pd.DataFrame
    test: pd.DataFrame

    def summary(self) -> pd.DataFrame:
        rows = []
        for name, part in (("Train", self.train), ("Embargo", self.embargo), ("Test", self.test)):
            rows.append({
                "Partition": name,
                "Start": part.index.min().date() if len(part) else None,
                "End": part.index.max().date() if len(part) else None,
                "Rows": len(part),
            })
        return pd.DataFrame(rows).set_index("Partition")


def chronological_split(
    frame: pd.DataFrame, test_fraction: float = 0.20, embargo_rows: int = 1
) -> ChronologicalSplit:
    """Split an already date-sorted frame into train / embargo / test blocks."""
    if not frame.index.is_monotonic_increasing:
        raise ValueError("Frame must be sorted chronologically before splitting.")
    n_rows = len(frame)
    n_test = int(round(n_rows * test_fraction))
    test_start = n_rows - n_test
    train_end = test_start - embargo_rows
    if n_test <= 0 or train_end <= 0:
        raise ValueError("Not enough rows for the requested split.")

    split = ChronologicalSplit(
        train=frame.iloc[:train_end],
        embargo=frame.iloc[train_end:test_start],
        test=frame.iloc[test_start:],
    )
    assert split.train.index.max() < split.test.index.min(), "train must precede test"
    return split
