# Data

## Source

| Item | Value |
|---|---|
| Instrument | NIFTY 50 index, National Stock Exchange of India |
| Ticker | `^NSEI` (Yahoo Finance) |
| Access | `yfinance` 1.7.0, `Ticker.history(interval="1d", auto_adjust=False)` |
| Requested window | `2015-01-01` (inclusive) to `2026-09-11` (exclusive) |
| Sessions in the snapshot | 2,879 (2015-01-02 to 2026-09-10) |
| Retrieved | 2026-09-11 19:23:44 UTC |
| SHA-256 of the CSV | `6461c511c539ce60b6f0e4a6b33268cc12b53f7eebdb0c26b76e581f76adde5b` |

`yfinance` is used for downloading only. Every indicator, feature and model is
implemented with pandas and scikit-learn.

## Files

| File | Content |
|---|---|
| `raw/nsei_daily_ohlcv.csv` | The download exactly as returned: `Date, Open, High, Low, Close, Adj Close, Volume`. It is never edited afterwards. |
| `raw/nsei_daily_ohlcv.meta.json` | Provenance: requested window, retrieval time, library version, row count and checksum. |

Processed data is never written back to this folder. The notebook recomputes
the cleaned series and all features in memory from the raw snapshot, and the
loader refuses to run if the CSV no longer matches its recorded checksum.

## Why the window ends on 2026-09-10

`END_DATE` in `src/config.py` is exclusive. When the snapshot was taken (just
after midnight IST on 2026-09-12), Yahoo's bar for 2026-09-11 had an open, high
and low but no closing value yet. Storing that partial bar would have made the
snapshot change on a later download, so the window stops at the last complete
session.

## Known characteristics of this snapshot

* `Adj Close` equals `Close`: the NIFTY 50 is a price index without dividends
  or splits. The column is kept in the raw file but not used.
* 28 sessions (between 2017 and 2024) report a volume of 0. Zero turnover is
  not plausible for the index, so the cleaning step records these as *volume
  unavailable*. Their prices are valid and remain in the series; rows whose
  volume-based features are undefined are excluded from modelling for all four
  approaches alike. The exact dates are printed in the notebook's cleaning step.
* No duplicate dates, no missing prices and no OHLC inconsistencies.

## Refreshing or extending the data

```bash
python run_pipeline.py --refresh
```

re-downloads the configured window before running the notebook (equivalent to
setting `STOCK_REFRESH_DATA=1`). Yahoo occasionally revises history, so a fresh
download can have a different checksum and slightly different results. To
extend the period, change `END_DATE` in `src/config.py`, then refresh.

## Terms of use

Yahoo Finance data is made available under Yahoo's terms of service, generally
for personal and research use. Before publishing this repository, decide
whether redistributing the CSV is appropriate for you. If it is not, add
`ml/data/raw/*.csv` to `.gitignore`: the notebook downloads the snapshot
automatically when the file is missing.
