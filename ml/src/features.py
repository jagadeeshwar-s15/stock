"""Causal feature engineering implemented directly in pandas.

Every feature at date t is a function of observations at or before t only:
rolling windows are trailing (never centred), exponential averages are
computed forward in time (``adjust=False``), and every lag uses a positive
shift. The module deliberately contains no negative shifts, no centred
windows and no backward filling; ``src.leakage`` scans this file to prove it
and re-computes every feature on truncated histories to prove it numerically.
"""

from __future__ import annotations

import numpy as np
import pandas as pd

RAW_FEATURES = ["Open", "High", "Low", "Close", "Volume"]

TECHNICAL_INDICATORS = [
    "SMA_20",
    "EMA_20",
    "RSI_14",
    "MACD",
    "MACD_Signal",
    "MACD_Hist",
    "Rolling_Volatility_20",
]

DERIVED_FEATURES = ["Return_5D", "Volume_Change"]

ENGINEERED_FEATURES = RAW_FEATURES + TECHNICAL_INDICATORS + DERIVED_FEATURES

# Human-readable definitions, exported to the notebook, README and dashboard.
FEATURE_DEFINITIONS: list[dict[str, str]] = [
    {"name": "Open", "category": "Raw", "group": "Price",
     "formula": "Open_t", "window": "1 day",
     "description": "Opening level of the session."},
    {"name": "High", "category": "Raw", "group": "Price",
     "formula": "High_t", "window": "1 day",
     "description": "Intraday high of the session."},
    {"name": "Low", "category": "Raw", "group": "Price",
     "formula": "Low_t", "window": "1 day",
     "description": "Intraday low of the session."},
    {"name": "Close", "category": "Raw", "group": "Price",
     "formula": "Close_t", "window": "1 day",
     "description": "Closing level of the session."},
    {"name": "Volume", "category": "Raw", "group": "Volume",
     "formula": "Volume_t", "window": "1 day",
     "description": "Reported traded volume for the session."},
    {"name": "SMA_20", "category": "Technical indicator", "group": "Trend",
     "formula": "mean(Close_t-19 ... Close_t)", "window": "20 days",
     "description": "Simple moving average of the close (trailing window)."},
    {"name": "EMA_20", "category": "Technical indicator", "group": "Trend",
     "formula": "EMA_t = a*Close_t + (1-a)*EMA_t-1, a = 2/21", "window": "20 days",
     "description": "Exponential moving average of the close (recursive, past only)."},
    {"name": "RSI_14", "category": "Technical indicator", "group": "Momentum",
     "formula": "100 - 100 / (1 + avg_gain_14 / avg_loss_14)  (Wilder)", "window": "14 days",
     "description": "Relative Strength Index with Wilder smoothing."},
    {"name": "MACD", "category": "Technical indicator", "group": "Momentum",
     "formula": "EMA_12(Close) - EMA_26(Close)", "window": "12 / 26 days",
     "description": "Moving Average Convergence Divergence line."},
    {"name": "MACD_Signal", "category": "Technical indicator", "group": "Momentum",
     "formula": "EMA_9(MACD)", "window": "9 days",
     "description": "Signal line: exponential average of the MACD line."},
    {"name": "MACD_Hist", "category": "Technical indicator", "group": "Momentum",
     "formula": "MACD - MACD_Signal", "window": "12 / 26 / 9 days",
     "description": "MACD histogram (distance between MACD and its signal)."},
    {"name": "Rolling_Volatility_20", "category": "Technical indicator", "group": "Volatility",
     "formula": "std(r_t-19 ... r_t),  r_t = Close_t / Close_t-1 - 1", "window": "20 days",
     "description": "Standard deviation of daily returns over a trailing window."},
    {"name": "Return_5D", "category": "Derived feature", "group": "Momentum",
     "formula": "Close_t / Close_t-5 - 1", "window": "5 days",
     "description": "Trailing five-session return (backward-looking)."},
    {"name": "Volume_Change", "category": "Derived feature", "group": "Volume",
     "formula": "Volume_t / Volume_t-1 - 1", "window": "2 days",
     "description": "Day-over-day change in reported volume."},
]


def simple_moving_average(series: pd.Series, window: int) -> pd.Series:
    """Trailing simple moving average (NaN until ``window`` observations exist)."""
    return series.rolling(window=window, min_periods=window).mean()


def exponential_moving_average(series: pd.Series, span: int) -> pd.Series:
    """Recursive EMA computed forward in time; NaN during the first ``span`` rows."""
    return series.ewm(span=span, adjust=False, min_periods=span).mean()


def relative_strength_index(close: pd.Series, window: int = 14) -> pd.Series:
    """Wilder's RSI using exponential smoothing with ``alpha = 1 / window``."""
    delta = close.diff()
    gains = delta.clip(lower=0.0)
    losses = -delta.clip(upper=0.0)
    avg_gain = gains.ewm(alpha=1.0 / window, adjust=False, min_periods=window).mean()
    avg_loss = losses.ewm(alpha=1.0 / window, adjust=False, min_periods=window).mean()
    rs = avg_gain / avg_loss
    rsi = 100.0 - 100.0 / (1.0 + rs)
    # No losses in the window means maximal strength, not an undefined value.
    rsi = rsi.where(avg_loss != 0.0, 100.0)
    return rsi.where(avg_gain.notna() & avg_loss.notna())


def macd(
    close: pd.Series, fast: int = 12, slow: int = 26, signal: int = 9
) -> tuple[pd.Series, pd.Series, pd.Series]:
    """MACD line, signal line and histogram."""
    macd_line = exponential_moving_average(close, fast) - exponential_moving_average(close, slow)
    signal_line = macd_line.ewm(span=signal, adjust=False, min_periods=signal).mean()
    return macd_line, signal_line, macd_line - signal_line


def trailing_return(series: pd.Series, periods: int) -> pd.Series:
    """Backward-looking return over ``periods`` rows: x_t / x_(t-periods) - 1."""
    if periods <= 0:
        raise ValueError("periods must be positive: a feature may only look backwards in time")
    return series / series.shift(periods) - 1.0


def rolling_volatility(close: pd.Series, window: int = 20) -> pd.Series:
    """Standard deviation of daily returns over a trailing window."""
    return trailing_return(close, 1).rolling(window=window, min_periods=window).std()


def add_technical_features(df: pd.DataFrame) -> pd.DataFrame:
    """Return a copy of ``df`` with every engineered feature appended.

    ``Volume_Change`` is undefined when the previous session reports zero
    volume (division by zero); those values become NaN instead of +/-inf and
    the affected rows are removed by :func:`build_modeling_frame`.
    """
    out = df.copy()
    close = out["Close"]
    out["SMA_20"] = simple_moving_average(close, 20)
    out["EMA_20"] = exponential_moving_average(close, 20)
    out["RSI_14"] = relative_strength_index(close, 14)
    out["MACD"], out["MACD_Signal"], out["MACD_Hist"] = macd(close)
    out["Rolling_Volatility_20"] = rolling_volatility(close, 20)
    out["Return_5D"] = trailing_return(close, 5)
    out["Volume_Change"] = trailing_return(out["Volume"], 1).replace([np.inf, -np.inf], np.nan)
    return out


def add_today_direction(df: pd.DataFrame) -> pd.DataFrame:
    """Today's realised direction (Close_t > Close_(t-1)); input to the Persistence baseline.

    It is known at the close of day t, but it is NOT one of the model features:
    it only feeds the naive "tomorrow matches today" rule.
    """
    out = df.copy()
    previous_close = out["Close"].shift(1)
    out["Prev_Close"] = previous_close
    out["Today_Direction"] = np.where(
        previous_close.isna(), np.nan, (out["Close"] > previous_close).astype(float)
    )
    return out


def build_modeling_frame(labelled: pd.DataFrame) -> tuple[pd.DataFrame, dict[str, int]]:
    """Keep only rows usable by *every* approach so all four share one sample.

    Drops (a) the indicator warm-up period, (b) rows whose ``Volume_Change``
    is undefined, and (c) the final row whose label does not exist yet.
    Returns the modeling frame and a count of rows removed for each reason.
    """
    required = ENGINEERED_FEATURES + ["Today_Direction"]
    feature_missing = labelled[required].isna().any(axis=1)
    label_missing = labelled["Target"].isna()

    first_complete = feature_missing.idxmin() if (~feature_missing).any() else None
    warmup_mask = labelled.index < first_complete if first_complete is not None else feature_missing
    reasons = {
        "warmup_rows": int(warmup_mask.sum()),
        "undefined_feature_rows_after_warmup": int((feature_missing & ~warmup_mask).sum()),
        "unlabelled_final_rows": int((label_missing & ~feature_missing).sum()),
    }

    frame = labelled.loc[~feature_missing & ~label_missing].copy()
    frame["Target"] = frame["Target"].astype(int)
    frame["Today_Direction"] = frame["Today_Direction"].astype(int)
    return frame, reasons
