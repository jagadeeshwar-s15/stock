"""Primary classifier: standardised Logistic Regression.

The scaler lives inside a scikit-learn ``Pipeline`` so it is re-fitted on the
training portion of every cross-validation fold and, finally, on the full
training period only. Hyper-parameter C is chosen with forward-chaining
``TimeSeriesSplit`` validation inside the training period; the test window is
never touched during selection.
"""

from __future__ import annotations

from dataclasses import dataclass

import numpy as np
import pandas as pd
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import GridSearchCV, TimeSeriesSplit
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler

from . import config


def build_pipeline(C: float = 1.0) -> Pipeline:
    """StandardScaler -> LogisticRegression (L2-regularised, deterministic lbfgs)."""
    return Pipeline([
        ("scaler", StandardScaler()),
        ("model", LogisticRegression(C=C, max_iter=config.MAX_ITER, random_state=config.RANDOM_STATE)),
    ])


def time_series_cv(n_splits: int = config.CV_SPLITS, gap: int = config.CV_GAP) -> TimeSeriesSplit:
    """Forward-chaining folds; ``gap`` rows are skipped before each validation block."""
    return TimeSeriesSplit(n_splits=n_splits, gap=gap)


@dataclass
class TunedModel:
    name: str
    features: list[str]
    best_C: float
    pipeline: Pipeline
    cv_results: pd.DataFrame

    def coefficients(self) -> pd.Series:
        """Coefficients on the standardised features (log-odds per 1 std. dev.)."""
        weights = self.pipeline.named_steps["model"].coef_.ravel()
        return pd.Series(weights, index=self.features, name=f"{self.name} coefficient")

    def intercept(self) -> float:
        return float(self.pipeline.named_steps["model"].intercept_[0])


def tune_and_fit(
    name: str,
    X_train: pd.DataFrame,
    y_train: pd.Series,
    c_grid: list[float] = config.C_GRID,
    cv: TimeSeriesSplit | None = None,
    scoring: str = config.TUNING_METRIC,
) -> TunedModel:
    """Select C by time-series CV on the training data, then refit on all of it.

    Ties in mean CV score resolve to the first (smallest, most regularised) C
    in the grid, which is GridSearchCV's documented behaviour.
    """
    search = GridSearchCV(
        estimator=build_pipeline(),
        param_grid={"model__C": c_grid},
        cv=cv or time_series_cv(),
        scoring=scoring,
        refit=True,
        return_train_score=True,
    )
    search.fit(X_train, y_train)

    results = pd.DataFrame(search.cv_results_)
    table = pd.DataFrame({
        "C": results["param_model__C"].astype(float),
        "mean_validation_accuracy": results["mean_test_score"],
        "std_validation_accuracy": results["std_test_score"],
        "mean_train_accuracy": results["mean_train_score"],
        "rank": results["rank_test_score"].astype(int),
    })
    fold_columns = sorted(c for c in results.columns if c.startswith("split") and c.endswith("_test_score"))
    for i, column in enumerate(fold_columns, start=1):
        table[f"fold_{i}"] = results[column]

    return TunedModel(
        name=name,
        features=list(X_train.columns),
        best_C=float(search.best_params_["model__C"]),
        pipeline=search.best_estimator_,
        cv_results=table,
    )


def fold_date_table(train_index: pd.DatetimeIndex, cv: TimeSeriesSplit) -> pd.DataFrame:
    """Date ranges of each forward-chaining fold, to show validation is always later."""
    rows = []
    placeholder = np.zeros(len(train_index))
    for fold, (fit_idx, val_idx) in enumerate(cv.split(placeholder), start=1):
        rows.append({
            "fold": fold,
            "fit_start": train_index[fit_idx[0]].date(),
            "fit_end": train_index[fit_idx[-1]].date(),
            "validation_start": train_index[val_idx[0]].date(),
            "validation_end": train_index[val_idx[-1]].date(),
            "fit_rows": len(fit_idx),
            "validation_rows": len(val_idx),
        })
    return pd.DataFrame(rows).set_index("fold")
