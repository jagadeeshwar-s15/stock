"""Unit tests for the leakage-sensitive building blocks.

They run on a small synthetic random walk (generated here, never presented as
market data) so they are fast and need no network access.
"""

from __future__ import annotations

import numpy as np
import pandas as pd
import pytest

from src import leakage
from src.baselines import majority_class, persistence_predictions
from src.data_loader import clean_data
from src.evaluation import mcnemar_exact, wilson_interval
from src.features import (ENGINEERED_FEATURES, RAW_FEATURES, add_technical_features,
                          add_today_direction, build_modeling_frame, trailing_return)
from src.models import time_series_cv, tune_and_fit
from src.split import chronological_split
from src.target import create_target


@pytest.fixture(scope="module")
def ohlcv() -> pd.DataFrame:
    rng = np.random.default_rng(7)
    dates = pd.bdate_range("2020-01-01", periods=420)
    close = 1000 * np.exp(np.cumsum(rng.normal(0, 0.01, len(dates))))
    open_ = np.r_[close[0], close[:-1]] * (1 + rng.normal(0, 0.002, len(dates)))
    high = np.maximum(open_, close) * (1 + rng.uniform(0, 0.005, len(dates)))
    low = np.minimum(open_, close) * (1 - rng.uniform(0, 0.005, len(dates)))
    volume = rng.integers(100_000, 900_000, len(dates)).astype(float)
    frame = pd.DataFrame({"Open": open_, "High": high, "Low": low, "Close": close, "Volume": volume},
                         index=pd.DatetimeIndex(dates, name="Date"))
    return frame


@pytest.fixture(scope="module")
def modeling(ohlcv):
    labelled = create_target(add_today_direction(add_technical_features(ohlcv)))
    frame, _ = build_modeling_frame(labelled)
    return labelled, frame


def test_target_is_next_day_direction_and_last_row_is_unlabelled(ohlcv):
    labelled = create_target(ohlcv)
    close = ohlcv["Close"].to_numpy()
    assert np.array_equal(labelled["Target"].to_numpy()[:-1], (close[1:] > close[:-1]).astype(float))
    assert np.isnan(labelled["Target"].iloc[-1])


def test_features_do_not_change_when_future_rows_are_removed(ohlcv):
    check, detail = leakage.truncation_test(ohlcv, n_points=15)
    assert check.passed, detail


def test_feature_code_has_no_look_ahead_constructs():
    assert leakage.check_feature_source().passed


def test_trailing_return_rejects_forward_lags(ohlcv):
    with pytest.raises(ValueError):
        trailing_return(ohlcv["Close"], -1)


def test_modeling_frame_drops_warmup_and_final_row(ohlcv, modeling):
    labelled, frame = modeling
    assert labelled.index[-1] not in frame.index
    assert frame[ENGINEERED_FEATURES].notna().all().all()
    assert frame.index.min() > ohlcv.index[25]  # MACD signal needs ~34 sessions of history


def test_split_is_chronological_with_embargo(modeling):
    _, frame = modeling
    split = chronological_split(frame, test_fraction=0.2, embargo_rows=1)
    assert split.train.index.max() < split.embargo.index.min() < split.test.index.min()
    assert pd.Timestamp(split.train["Next_Date"].max()) < split.test.index.min()
    assert all(c.passed for c in leakage.check_split(split, frame))


def test_baselines_use_training_labels_and_past_prices(ohlcv, modeling):
    _, frame = modeling
    split = chronological_split(frame, 0.2, 1)
    majority, summary = majority_class(split.train["Target"])
    assert majority == int(summary["up"] >= summary["down"])
    persistence = persistence_predictions(split.test)
    assert leakage.check_persistence(ohlcv, split.test, persistence).passed


def test_scaler_is_fitted_on_training_rows_only(modeling):
    _, frame = modeling
    split = chronological_split(frame, 0.2, 1)
    model = tune_and_fit("Raw OHLCV", split.train[RAW_FEATURES], split.train["Target"],
                         c_grid=[0.1, 1.0], cv=time_series_cv(n_splits=3, gap=1))
    assert leakage.check_scaler(model.pipeline, split.train[RAW_FEATURES], frame[RAW_FEATURES], "raw").passed
    assert leakage.check_cv_folds(time_series_cv(n_splits=3, gap=1), len(split.train)).passed


def test_clean_data_sorts_deduplicates_and_flags_missing_volume():
    raw = pd.DataFrame({
        "Date": ["2024-01-03", "2024-01-02", "2024-01-02", "2024-01-04", "2024-01-05"],
        "Open": [11.0, 10.0, 10.0, 12.0, 13.0],
        "High": [11.5, 10.5, 10.5, 12.5, 13.5],
        "Low": [10.5, 9.5, 9.5, 11.5, 12.5],
        "Close": [11.2, 10.2, 10.2, 12.2, None],
        "Volume": [100, 90, 90, 0, 120],
    })
    clean, report = clean_data(raw)
    assert list(clean.index.strftime("%Y-%m-%d")) == ["2024-01-02", "2024-01-03", "2024-01-04"]
    assert report["duplicate_dates_removed"] == 1
    assert report["incomplete_rows_removed"] == 1
    assert report["volume_unavailable_rows"] == 1
    assert np.isnan(clean.loc["2024-01-04", "Volume"])


def test_statistics_helpers():
    low, high = wilson_interval(55, 100)
    assert low < 0.55 < high
    y = pd.Series([1, 0, 1, 1, 0, 1])
    identical = mcnemar_exact(y, y, y)
    assert identical["discordant"] == 0 and identical["p_value"] == 1.0
