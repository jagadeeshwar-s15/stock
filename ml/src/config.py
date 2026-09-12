"""Central experiment configuration.

Every value that affects the results lives here so the experiment is fully
described in one place. Changing a value here (for example ``END_DATE``) and
re-running the notebook is the only supported way to change the experiment.
"""

from __future__ import annotations

from pathlib import Path

# ---------------------------------------------------------------------------
# Paths (all relative to the ``ml/`` project directory, never absolute)
# ---------------------------------------------------------------------------
PROJECT_DIR = Path(__file__).resolve().parents[1]
DATA_DIR = PROJECT_DIR / "data"
RAW_DATA_DIR = DATA_DIR / "raw"
RESULTS_DIR = PROJECT_DIR / "results"
NOTEBOOK_PATH = PROJECT_DIR / "notebooks" / "stock_price_movement_predictor.ipynb"

RAW_DATA_FILE = RAW_DATA_DIR / "nsei_daily_ohlcv.csv"
RAW_METADATA_FILE = RAW_DATA_DIR / "nsei_daily_ohlcv.meta.json"
DASHBOARD_FILE = RESULTS_DIR / "dashboard.json"

# ---------------------------------------------------------------------------
# Dataset
# ---------------------------------------------------------------------------
TICKER = "^NSEI"
DATASET_NAME = "NIFTY 50"
DATA_SOURCE = "Yahoo Finance"
DATA_ACCESS_LIBRARY = "yfinance"
FREQUENCY = "Daily"

# Fixed, documented window. END_DATE is *exclusive* (yfinance convention), so
# the last session in the snapshot is 2026-09-10. When the snapshot was taken
# (2026-09-11 19:14 UTC, i.e. just after midnight IST on 2026-09-12) Yahoo's
# bar for 2026-09-11 still had no closing value, so the window stops at the
# last complete session instead of storing a partial bar.
START_DATE = "2015-01-01"
END_DATE = "2026-09-11"

# Set STOCK_REFRESH_DATA=1 to force a re-download of the snapshot above.
REFRESH_ENV_VAR = "STOCK_REFRESH_DATA"

# ---------------------------------------------------------------------------
# Evaluation design
# ---------------------------------------------------------------------------
TEST_FRACTION = 0.20      # final chronological hold-out
EMBARGO_ROWS = 1          # rows purged between train and test (label horizon)
CV_SPLITS = 5             # TimeSeriesSplit folds inside the training period
CV_GAP = 1                # rows skipped between each CV train/validation fold
C_GRID = [0.001, 0.01, 0.1, 1.0, 10.0, 100.0]
TUNING_METRIC = "accuracy"
RANDOM_STATE = 42
MAX_ITER = 5000

ROLLING_ACCURACY_WINDOW = 60   # sessions, for the diagnostic rolling-accuracy panel
TRUNCATION_TEST_POINTS = 40    # cut points used by the causal-feature audit

# Thresholds used to describe class balance (share of the majority class).
BALANCED_MAX_SHARE = 0.52
MILD_IMBALANCE_MAX_SHARE = 0.60

# An improvement is called "practically meaningful" only if it is at least this
# many percentage points AND statistically distinguishable (McNemar p < ALPHA).
MEANINGFUL_IMPROVEMENT_PP = 2.0
ALPHA = 0.05
