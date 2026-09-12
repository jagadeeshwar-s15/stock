"""Data acquisition and cleaning for daily OHLCV data.

The raw download is stored untouched in ``data/raw/`` together with a small
metadata file (source, requested window, retrieval time, checksum). Every run
of the notebook starts from that snapshot, so results are reproducible even if
the upstream provider later revises its history. Cleaning never edits prices:
it only parses, sorts, de-duplicates and removes rows that are not valid
trading sessions, and it reports every action it takes.
"""

from __future__ import annotations

import hashlib
import json
import os
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd

from . import config

OHLCV_COLUMNS = ["Open", "High", "Low", "Close", "Volume"]
PRICE_COLUMNS = ["Open", "High", "Low", "Close"]


def _sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def download_ohlcv(
    ticker: str = config.TICKER,
    start: str = config.START_DATE,
    end: str = config.END_DATE,
    retries: int = 3,
) -> pd.DataFrame:
    """Download daily OHLCV bars from Yahoo Finance via ``yfinance``.

    ``end`` is exclusive. Prices are requested unadjusted (``auto_adjust=False``);
    for a price index such as ^NSEI there are no dividends or splits, so the
    adjusted and unadjusted closes are identical anyway.
    """
    import yfinance as yf  # imported lazily: only needed when (re)downloading

    last_error: Exception | None = None
    history = pd.DataFrame()
    for attempt in range(retries):
        try:
            history = yf.Ticker(ticker).history(
                start=start, end=end, interval="1d", auto_adjust=False, actions=False
            )
            if not history.empty:
                break
        except Exception as exc:  # network / rate-limit errors from the provider
            last_error = exc
        time.sleep(2 ** attempt)
    if history.empty:
        raise RuntimeError(
            f"Could not download {ticker} from Yahoo Finance after {retries} attempts"
            + (f": {last_error}" if last_error else ".")
        )

    frame = history.reset_index()
    dates = pd.to_datetime(frame["Date"])
    if dates.dt.tz is not None:
        # Keep the exchange-local calendar date (IST for NSE), drop the timezone.
        dates = dates.dt.tz_localize(None)
    frame["Date"] = dates.dt.normalize()
    keep = ["Date"] + [c for c in ["Open", "High", "Low", "Close", "Adj Close", "Volume"] if c in frame]
    return frame[keep]


def load_raw_data(
    path: Path = config.RAW_DATA_FILE,
    metadata_path: Path = config.RAW_METADATA_FILE,
    refresh: bool | None = None,
) -> tuple[pd.DataFrame, dict[str, Any]]:
    """Load the raw snapshot, downloading it first if it is missing.

    Set the environment variable ``STOCK_REFRESH_DATA=1`` (or ``refresh=True``)
    to replace the snapshot with a fresh download of the configured window.
    """
    if refresh is None:
        refresh = os.environ.get(config.REFRESH_ENV_VAR, "").strip() == "1"

    if refresh or not path.exists():
        import yfinance as yf

        downloaded = download_ohlcv()
        path.parent.mkdir(parents=True, exist_ok=True)
        downloaded.to_csv(path, index=False, date_format="%Y-%m-%d")
        metadata = {
            "dataset": config.DATASET_NAME,
            "ticker": config.TICKER,
            "source": config.DATA_SOURCE,
            "access_library": f"{config.DATA_ACCESS_LIBRARY} {yf.__version__}",
            "frequency": config.FREQUENCY,
            "requested_start": config.START_DATE,
            "requested_end_exclusive": config.END_DATE,
            "retrieved_at_utc": datetime.now(timezone.utc).replace(microsecond=0).isoformat(),
            "rows": int(len(downloaded)),
            "first_date": str(downloaded["Date"].min().date()),
            "last_date": str(downloaded["Date"].max().date()),
            "sha256": _sha256(path),
        }
        metadata_path.write_text(json.dumps(metadata, indent=2) + "\n", encoding="utf-8")

    raw = pd.read_csv(path)
    metadata = json.loads(metadata_path.read_text(encoding="utf-8")) if metadata_path.exists() else {}
    if metadata.get("sha256") and metadata["sha256"] != _sha256(path):
        raise ValueError(
            f"{path.name} does not match the checksum recorded in {metadata_path.name}; "
            "the snapshot was modified after download. Re-download it with STOCK_REFRESH_DATA=1."
        )
    return raw, metadata


def clean_data(raw: pd.DataFrame) -> tuple[pd.DataFrame, dict[str, Any]]:
    """Validate and tidy raw OHLCV rows.

    Steps: parse dates -> coerce OHLCV to numeric -> sort ascending -> drop
    duplicate dates -> drop rows without a complete set of prices -> drop rows
    with impossible values (non-positive prices, negative volume) -> report
    OHLC consistency. Returns a Date-indexed frame with only OHLCV columns and
    a report describing each step.
    """
    missing_columns = [c for c in ["Date", *OHLCV_COLUMNS] if c not in raw.columns]
    if missing_columns:
        raise ValueError(f"Raw data is missing required columns: {missing_columns}")

    df = raw.copy()
    report: dict[str, Any] = {"raw_rows": int(len(df)), "raw_columns": list(raw.columns)}

    df["Date"] = pd.to_datetime(df["Date"], errors="coerce")
    report["unparseable_dates_removed"] = int(df["Date"].isna().sum())
    df = df.dropna(subset=["Date"])

    non_numeric = {}
    for column in OHLCV_COLUMNS:
        before = int(df[column].isna().sum())
        df[column] = pd.to_numeric(df[column], errors="coerce")
        non_numeric[column] = int(df[column].isna().sum()) - before
    report["non_numeric_values_coerced"] = non_numeric
    report["missing_values"] = {c: int(df[c].isna().sum()) for c in OHLCV_COLUMNS}

    report["input_was_sorted"] = bool(df["Date"].is_monotonic_increasing)
    df = df.sort_values("Date", kind="mergesort")

    duplicated = df["Date"].duplicated(keep="first")
    report["duplicate_dates_removed"] = int(duplicated.sum())
    df = df.loc[~duplicated]

    # A row without a full set of prices is not a complete trading session.
    incomplete = df[PRICE_COLUMNS].isna().any(axis=1)
    report["incomplete_rows_removed"] = int(incomplete.sum())
    report["incomplete_row_dates"] = [str(d.date()) for d in df.loc[incomplete, "Date"]]
    df = df.loc[~incomplete]

    impossible = (df[PRICE_COLUMNS] <= 0).any(axis=1) | (df["Volume"] < 0)
    report["impossible_rows_removed"] = int(impossible.sum())
    df = df.loc[~impossible]

    # The provider reports zero volume for a handful of NIFTY 50 sessions whose
    # prices are valid. Zero turnover is not plausible for the index, so these
    # are recorded as "volume unavailable" (NaN) instead of a real 0. The
    # sessions stay in the price history - dropping them would make the next-day
    # label of the previous row span two sessions - and rows whose volume
    # features are undefined are later excluded from modelling.
    unavailable_volume = df["Volume"].isna() | (df["Volume"] == 0)
    report["volume_unavailable_rows"] = int(unavailable_volume.sum())
    report["volume_unavailable_dates"] = [str(d.date()) for d in df.loc[unavailable_volume, "Date"]]
    df.loc[unavailable_volume, "Volume"] = np.nan

    # Consistency of the OHLC bar. Violations are reported, not "repaired":
    # changing a price would mean inventing data.
    tolerance = 1e-6
    high_violation = df["High"] + tolerance < df[["Open", "Close", "Low"]].max(axis=1)
    low_violation = df["Low"] - tolerance > df[["Open", "Close", "High"]].min(axis=1)
    report["high_below_open_or_close"] = int(high_violation.sum())
    report["low_above_open_or_close"] = int(low_violation.sum())
    report["flat_bars_open_eq_high_eq_low_eq_close"] = int(
        ((df["Open"] == df["High"]) & (df["High"] == df["Low"]) & (df["Low"] == df["Close"])).sum()
    )

    clean = df.set_index("Date")[OHLCV_COLUMNS].astype(float)
    clean.index.name = "Date"

    assert clean.index.is_monotonic_increasing, "dates must be sorted ascending"
    assert clean.index.is_unique, "dates must be unique"
    report["clean_rows"] = int(len(clean))
    report["first_date"] = str(clean.index.min().date())
    report["last_date"] = str(clean.index.max().date())
    return clean, report
