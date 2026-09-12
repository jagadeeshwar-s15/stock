"""Next-day direction label.

This is the ONLY module in the project that looks forward in time, and it only
does so to build the *label*. Nothing produced here is ever used as a model
input: ``Next_Date`` and ``Next_Close`` exist purely so the label can be
audited next to the features in the notebook.

    Target_t = 1  if Close_(t+1) >  Close_t   (UP)
    Target_t = 0  if Close_(t+1) <= Close_t   (DOWN or unchanged)

The final observation has no Close_(t+1), so its label is undefined (NaN) and
the row is excluded from supervised training and testing.
"""

from __future__ import annotations

import numpy as np
import pandas as pd

LABEL_COLUMNS = ["Next_Date", "Next_Close", "Target"]


def create_target(df: pd.DataFrame) -> pd.DataFrame:
    """Append ``Next_Date``, ``Next_Close`` and the binary ``Target``.

    The comparison is only evaluated where a next close exists, so the last
    row gets ``NaN`` rather than being silently labelled 0 (the classic bug of
    ``(close.shift(-1) > close).astype(int)``).
    """
    out = df.copy()
    next_close = out["Close"].shift(-1)
    out["Next_Date"] = pd.Series(out.index, index=out.index).shift(-1)
    out["Next_Close"] = next_close
    out["Target"] = np.where(
        next_close.isna(), np.nan, (next_close > out["Close"]).astype(float)
    )
    return out


def count_unchanged_closes(df: pd.DataFrame) -> int:
    """Number of labelled rows where Close_(t+1) == Close_t (labelled DOWN)."""
    labelled = df.dropna(subset=["Next_Close"])
    return int((labelled["Next_Close"] == labelled["Close"]).sum())
