"""
AutoML Service
Enterprise AI Data Analyst - Automated Machine Learning Studio

A self-contained module that:
  1. Inspects an uploaded dataset (schema, roles, quality, signal).
  2. Detects the ML task: regression / classification / clustering / time-series.
  3. Ranks candidate target columns by suitability.
  4. Recommends the best models for the chosen task with a data-driven
     rationale explaining *why* each model fits this specific dataset.

Everything below is heuristic but statistically grounded. It runs on the
existing DuckDB + pandas stack with zero new hard dependencies. Optional
sklearn-backed training/prediction is guarded so its absence never breaks
the inspect/recommend flow.
"""
from __future__ import annotations

import re
from typing import Any, Dict, List, Optional, Tuple

import numpy as np
import pandas as pd

from app.database.duckdb_client import get_duckdb
from app.database.sqlite_client import get_sqlite
from app.database.models import Dataset as DatasetModel

# When a table is very large, heuristic columns stats are computed on a
# deterministic sample. The true row count is always reported.
HEURISTIC_SAMPLE_CAP = 100_000

# Minimum distinct values a target needs before regression is credible.
_REGRESSION_MIN_DISTINCT = 20


# =============================================================================
# JSON helpers
# =============================================================================

def _to_native(obj: Any) -> Any:
    """Recursively convert numpy/pandas scalar types to native Python for JSON."""
    if isinstance(obj, dict):
        return {k: _to_native(v) for k, v in obj.items()}
    if isinstance(obj, (list, tuple, set)):
        return [_to_native(v) for v in obj]
    if isinstance(obj, (np.integer,)):
        return int(obj)
    if isinstance(obj, (np.floating,)):
        return float(obj)
    if isinstance(obj, (np.bool_,)):
        return bool(obj)
    if isinstance(obj, np.ndarray):
        return _to_native(obj.tolist())
    if isinstance(obj, (pd.Timestamp, pd.Timedelta)):
        return str(obj)
    if isinstance(obj, float) and np.isnan(obj):
        return None
    return obj


def _table_name(dataset_id: str) -> str:
    """DuckDB table name convention (matches data_processor_service)."""
    return f"dataset_{dataset_id.replace('-', '_')}"


# =============================================================================
# Model knowledge base
# =============================================================================

# Capability attributes shared by supervised models. Scores 0-100.
_CAPABILITIES = (
    "small_data",
    "large_data",
    "non_linear",
    "interpretability",
    "missing_handling",
    "train_speed",
)

_SUPERVISED_MODELS: Dict[str, List[Dict[str, Any]]] = {
    "regression": [
        {
            "id": "linear_regression",
            "name": "Linear Regression",
            "family": "linear",
            "tier": "baseline",
            "trainable": True,
            "capabilities": {"small_data": 92, "large_data": 45, "non_linear": 18,
                             "interpretability": 96, "missing_handling": 28, "train_speed": 95},
            "best_for": "Linear relationships, small-to-medium data, and stakeholders who need coefficients they can explain.",
            "tradeoffs": "Assumes linearity; sensitive to outliers and multicollinearity; limited on strong non-linear data.",
            "metrics": ["R²", "RMSE", "MAE"],
            "tags": ["interpretable", "fast", "baseline"],
            "requires": "sklearn",
        },
        {
            "id": "ridge_regression",
            "name": "Ridge Regression",
            "family": "linear",
            "tier": "baseline",
            "trainable": True,
            "capabilities": {"small_data": 88, "large_data": 52, "non_linear": 22,
                             "interpretability": 90, "missing_handling": 30, "train_speed": 92},
            "best_for": "High-dimensional or correlated features where plain linear regression overfits.",
            "tradeoffs": "Still linear; adds an L2 penalty that slightly shrinks coefficients.",
            "metrics": ["R²", "RMSE", "MAE"],
            "tags": ["interpretable", "regularized", "stable"],
            "requires": "sklearn",
        },
        {
            "id": "elastic_net",
            "name": "ElasticNet",
            "family": "linear",
            "tier": "alternative",
            "trainable": True,
            "capabilities": {"small_data": 82, "large_data": 55, "non_linear": 30,
                             "interpretability": 84, "missing_handling": 28, "train_speed": 88},
            "best_for": "Many weakly-correlated features where automatic feature selection helps.",
            "tradeoffs": "Combines L1+L2 penalties; needs hyperparameter tuning for alpha/l1_ratio.",
            "metrics": ["R²", "RMSE", "MAE"],
            "tags": ["regularized", "sparse", "feature-selection"],
            "requires": "sklearn",
        },
        {
            "id": "svr",
            "name": "Support Vector Regression",
            "family": "kernel",
            "tier": "alternative",
            "trainable": True,
            "capabilities": {"small_data": 65, "large_data": 28, "non_linear": 86,
                             "interpretability": 28, "missing_handling": 38, "train_speed": 40},
            "best_for": "Small, non-linear datasets where a kernel can capture structure.",
            "tradeoffs": "Scales poorly to large data; no feature importance; sensitive to feature scaling.",
            "metrics": ["R²", "RMSE", "MAE"],
            "tags": ["kernel", "non-linear"],
            "requires": "sklearn",
        },
        {
            "id": "knn_regressor",
            "name": "k-Nearest Neighbors",
            "family": "instance",
            "tier": "alternative",
            "trainable": True,
            "capabilities": {"small_data": 72, "large_data": 22, "non_linear": 82,
                             "interpretability": 42, "missing_handling": 50, "train_speed": 60},
            "best_for": "Local non-linear patterns when the dataset is compact enough for fast lookups.",
            "tradeoffs": "Slow predictions at scale; memory heavy; sensitive to scaling and curse of dimensionality.",
            "metrics": ["R²", "RMSE", "MAE"],
            "tags": ["non-parametric", "local"],
            "requires": "sklearn",
        },
        {
            "id": "decision_tree_regressor",
            "name": "Decision Tree Regressor",
            "family": "tree",
            "tier": "alternative",
            "trainable": True,
            "capabilities": {"small_data": 82, "large_data": 58, "non_linear": 88,
                             "interpretability": 94, "missing_handling": 82, "train_speed": 80},
            "best_for": "Quick, interpretable rule-based fits; a great diagnostic before ensembles.",
            "tradeoffs": "High variance — a single tree overfits; noisy predictions on unseen data.",
            "metrics": ["R²", "RMSE", "MAE"],
            "tags": ["interpretable", "rules"],
            "requires": "sklearn",
        },
        {
            "id": "random_forest_regressor",
            "name": "Random Forest Regressor",
            "family": "ensemble",
            "tier": "recommended",
            "trainable": True,
            "capabilities": {"small_data": 60, "large_data": 90, "non_linear": 94,
                             "interpretability": 70, "missing_handling": 85, "train_speed": 70},
            "best_for": "Robust non-linear regression with feature-importance ranking and excellent tolerance for messy data.",
            "tradeoffs": "Less interpretable than a single tree; larger models; not extrapolative beyond training range.",
            "metrics": ["R²", "RMSE", "MAE", "MAPE"],
            "tags": ["robust", "non-linear", "feature-importance"],
            "requires": "sklearn",
        },
        {
            "id": "gradient_boosting_regressor",
            "name": "Gradient Boosting Regressor",
            "family": "ensemble",
            "tier": "recommended",
            "trainable": True,
            "capabilities": {"small_data": 42, "large_data": 96, "non_linear": 95,
                             "interpretability": 60, "missing_handling": 76, "train_speed": 58},
            "best_for": "Higher accuracy than random forests on medium-to-large datasets, at the cost of tuning.",
            "tradeoffs": "More hyperparameters to tune; can overfit with too many trees; slower to train.",
            "metrics": ["R²", "RMSE", "MAE", "MAPE"],
            "tags": ["accurate", "gradient", "ensemble"],
            "requires": "sklearn",
        },
        {
            "id": "xgboost_regressor",
            "name": "XGBoost",
            "family": "ensemble",
            "tier": "specialist",
            "trainable": True,
            "capabilities": {"small_data": 36, "large_data": 100, "non_linear": 95,
                             "interpretability": 55, "missing_handling": 82, "train_speed": 62},
            "best_for": "Competition-grade accuracy on large tabular datasets; built-in regularization.",
            "tradeoffs": "Requires installation of the xgboost package; many hyperparameters; black-box.",
            "metrics": ["R²", "RMSE", "MAE", "MAPE"],
            "tags": ["gradient", "high-accuracy", "competition"],
            "requires": "xgboost",
        },
    ],
    "classification": [
        {
            "id": "logistic_regression",
            "name": "Logistic Regression",
            "family": "linear",
            "tier": "baseline",
            "trainable": True,
            "capabilities": {"small_data": 92, "large_data": 48, "non_linear": 24,
                             "interpretability": 96, "missing_handling": 28, "train_speed": 94},
            "best_for": "A fast, interpretable baseline that often performs surprisingly well on clean, separable data.",
            "tradeoffs": "Linear decision boundary; needs well-scaled features; weak on complex interactions.",
            "metrics": ["Accuracy", "F1", "ROC-AUC"],
            "tags": ["interpretable", "baseline", "fast"],
            "requires": "sklearn",
        },
        {
            "id": "naive_bayes",
            "name": "Naive Bayes",
            "family": "probabilistic",
            "tier": "alternative",
            "trainable": True,
            "capabilities": {"small_data": 90, "large_data": 62, "non_linear": 48,
                             "interpretability": 88, "missing_handling": 38, "train_speed": 96},
            "best_for": "Very fast probabilistic baselines, especially with high-cardinality categorical features.",
            "tradeoffs": "Assumes feature independence; competitive accuracy is limited on correlated features.",
            "metrics": ["Accuracy", "F1", "ROC-AUC"],
            "tags": ["fast", "probabilistic", "baseline"],
            "requires": "sklearn",
        },
        {
            "id": "svc",
            "name": "Support Vector Machine",
            "family": "kernel",
            "tier": "alternative",
            "trainable": True,
            "capabilities": {"small_data": 66, "large_data": 30, "non_linear": 87,
                             "interpretability": 26, "missing_handling": 36, "train_speed": 44},
            "best_for": "Small-to-medium, non-linear classification with a strong margin guarantee.",
            "tradeoffs": "Poor scaling to large data; no probability calibration by default; sensitive to scaling.",
            "metrics": ["Accuracy", "F1", "ROC-AUC"],
            "tags": ["kernel", "margin"],
            "requires": "sklearn",
        },
        {
            "id": "knn_classifier",
            "name": "k-Nearest Neighbors",
            "family": "instance",
            "tier": "alternative",
            "trainable": True,
            "capabilities": {"small_data": 72, "large_data": 22, "non_linear": 82,
                             "interpretability": 42, "missing_handling": 50, "train_speed": 62},
            "best_for": "Locally-structured decision boundaries on compact datasets.",
            "tradeoffs": "Prediction is slow at scale; sensitive to scaling and irrelevant features.",
            "metrics": ["Accuracy", "F1", "ROC-AUC"],
            "tags": ["non-parametric", "local"],
            "requires": "sklearn",
        },
        {
            "id": "decision_tree_classifier",
            "name": "Decision Tree Classifier",
            "family": "tree",
            "tier": "alternative",
            "trainable": True,
            "capabilities": {"small_data": 82, "large_data": 58, "non_linear": 88,
                             "interpretability": 94, "missing_handling": 82, "train_speed": 82},
            "best_for": "Fast, interpretable splits and a sanity check before ensembling.",
            "tradeoffs": "Single trees overfit; unstable splits under small perturbations.",
            "metrics": ["Accuracy", "F1", "ROC-AUC"],
            "tags": ["interpretable", "rules"],
            "requires": "sklearn",
        },
        {
            "id": "random_forest_classifier",
            "name": "Random Forest Classifier",
            "family": "ensemble",
            "tier": "recommended",
            "trainable": True,
            "capabilities": {"small_data": 62, "large_data": 90, "non_linear": 94,
                             "interpretability": 70, "missing_handling": 86, "train_speed": 72},
            "best_for": "Robust accuracy, feature-importance insight, and good handling of noisy/imbalanced data.",
            "tradeoffs": "Black-box vs. single trees; memory heavy; weaker on extrapolation.",
            "metrics": ["Accuracy", "F1", "ROC-AUC", "Precision", "Recall"],
            "tags": ["robust", "non-linear", "feature-importance"],
            "requires": "sklearn",
        },
        {
            "id": "gradient_boosting_classifier",
            "name": "Gradient Boosting Classifier",
            "family": "ensemble",
            "tier": "recommended",
            "trainable": True,
            "capabilities": {"small_data": 44, "large_data": 96, "non_linear": 95,
                             "interpretability": 58, "missing_handling": 76, "train_speed": 60},
            "best_for": "Top-tier accuracy on tabular classification with careful tuning.",
            "tradeoffs": "Needs tuning to avoid overfit; slower training; opaque.",
            "metrics": ["Accuracy", "F1", "ROC-AUC", "Precision", "Recall"],
            "tags": ["accurate", "gradient", "ensemble"],
            "requires": "sklearn",
        },
        {
            "id": "xgboost_classifier",
            "name": "XGBoost",
            "family": "ensemble",
            "tier": "specialist",
            "trainable": True,
            "capabilities": {"small_data": 38, "large_data": 100, "non_linear": 95,
                             "interpretability": 52, "missing_handling": 84, "train_speed": 64},
            "best_for": "State-of-the-art tabular accuracy, especially when there is lots of data.",
            "tradeoffs": "Extra package dependency; hyperparameter-heavy; black-box.",
            "metrics": ["Accuracy", "F1", "ROC-AUC", "Precision", "Recall"],
            "tags": ["gradient", "high-accuracy", "competition"],
            "requires": "xgboost",
        },
    ],
    "clustering": [
        {
            "id": "kmeans",
            "name": "K-Means",
            "family": "partitional",
            "tier": "recommended",
            "trainable": True,
            "capabilities": {"scalability": 92, "shape_handling": 35, "outlier_handling": 35,
                             "interpretability": 80, "no_components": 70, "train_speed": 90},
            "best_for": "Spherical, well-separated clusters at scale; the standard first pass for segmentation.",
            "tradeoffs": "Assumes convex (globular) clusters; sensitive to outliers; needs you to choose K.",
            "metrics": ["Silhouette", "Inertia", "Davies-Bouldin"],
            "tags": ["scalable", "classic", "segmentation"],
            "requires": "sklearn",
        },
        {
            "id": "dbscan",
            "name": "DBSCAN",
            "family": "density",
            "tier": "recommended",
            "trainable": True,
            "capabilities": {"scalability": 75, "shape_handling": 92, "outlier_handling": 92,
                             "interpretability": 55, "no_components": 95, "train_speed": 55},
            "best_for": "Arbitrarily-shaped clusters and robust outlier detection; K is discovered, not chosen.",
            "tradeoffs": "Sensitive to eps/min_samples; struggles with varying-density clusters and high dimensions.",
            "metrics": ["Silhouette", "Outlier Ratio", "Cluster Count"],
            "tags": ["density", "outliers", "auto-k"],
            "requires": "sklearn",
        },
        {
            "id": "hierarchical",
            "name": "Agglomerative Clustering",
            "family": "hierarchical",
            "tier": "alternative",
            "trainable": True,
            "capabilities": {"scalability": 40, "shape_handling": 70, "outlier_handling": 60,
                             "interpretability": 95, "no_components": 70, "train_speed": 40},
            "best_for": "Interpretable dendrograms and nested segment hierarchies on small data.",
            "tradeoffs": "O(n²) memory/time — impractical beyond a few thousand rows.",
            "metrics": ["Silhouette", "Dendrogram", "Cophenetic"],
            "tags": ["hierarchy", "interpretable", "dendrogram"],
            "requires": "sklearn",
        },
        {
            "id": "gaussian_mixture",
            "name": "Gaussian Mixture Model",
            "family": "distribution",
            "tier": "alternative",
            "trainable": True,
            "capabilities": {"scalability": 55, "shape_handling": 60, "outlier_handling": 55,
                             "interpretability": 65, "no_components": 70, "train_speed": 60},
            "best_for": "Soft (probabilistic) memberships and overlapping clusters.",
            "tradeoffs": "Can converge to poor local optima; assumes Gaussian components.",
            "metrics": ["BIC", "AIC", "Silhouette"],
            "tags": ["soft-clustering", "probabilistic"],
            "requires": "sklearn",
        },
    ],
    "time_series": [
        {
            "id": "exponential_smoothing",
            "name": "Holt-Winters (Exponential Smoothing)",
            "family": "smoothing",
            "tier": "recommended",
            "trainable": True,
            "capabilities": {"trend_handling": 80, "seasonal_handling": 85, "data_volume": 60,
                             "interpretability": 90, "non_stationarity": 60, "train_speed": 95},
            "best_for": "Clean trend + seasonality with a small number of hyperparameters.",
            "tradeoffs": "Weak on complex dynamics and external regressors.",
            "metrics": ["MAE", "RMSE", "MAPE", "AIC"],
            "tags": ["trend", "seasonality", "fast"],
            "requires": "statsmodels",
        },
        {
            "id": "sarima",
            "name": "SARIMA",
            "family": "statistical",
            "tier": "recommended",
            "trainable": True,
            "capabilities": {"trend_handling": 90, "seasonal_handling": 92, "data_volume": 70,
                             "interpretability": 85, "non_stationarity": 88, "train_speed": 60},
            "best_for": "Rigorous, well-studied forecasting with explicit trend/seasonal orders.",
            "tradeoffs": "Sensitive to parameter selection (p,d,q,P,D,Q); slow on long series.",
            "metrics": ["MAE", "RMSE", "MAPE", "AIC"],
            "tags": ["statistical", "arima", "seasonal"],
            "requires": "statsmodels",
        },
        {
            "id": "prophet",
            "name": "Prophet",
            "family": "decomposition",
            "tier": "recommended",
            "trainable": True,
            "capabilities": {"trend_handling": 92, "seasonal_handling": 95, "data_volume": 85,
                             "interpretability": 80, "non_stationarity": 80, "train_speed": 75},
            "best_for": "Business time series with strong seasonality, holidays, and missing timestamps.",
            "tradeoffs": "Extra package dependency; less transparent than explicit ARIMA orders.",
            "metrics": ["MAE", "RMSE", "MAPE", "Coverage"],
            "tags": ["seasonality", "holidays", "facebook"],
            "requires": "prophet",
        },
        {
            "id": "ml_forecast",
            "name": "Tree-Based Forecast (lag features)",
            "family": "machine-learning",
            "tier": "specialist",
            "trainable": True,
            "capabilities": {"trend_handling": 85, "seasonal_handling": 88, "data_volume": 95,
                             "interpretability": 55, "non_stationarity": 75, "train_speed": 70},
            "best_for": "Complex series with many external regressors; often wins when data is plentiful.",
            "tradeoffs": "Needs lag/window feature engineering; easier to overfit; black-box.",
            "metrics": ["MAE", "RMSE", "MAPE", "Feature Importance"],
            "tags": ["lag-features", "high-accuracy", "regressors"],
            "requires": "sklearn",
        },
    ],
}

# Attribute names per task family — the capabilities that drive the "why".
_CAP_DEFS = {
    "supervised": ["small_data", "large_data", "non_linear", "interpretability", "missing_handling", "train_speed"],
    "clustering": ["scalability", "shape_handling", "outlier_handling", "interpretability", "no_components", "train_speed"],
    "time_series": ["trend_handling", "seasonal_handling", "data_volume", "interpretability", "non_stationarity", "train_speed"],
}

_METRIC_LABELS = {
    "small_data": "Small data",
    "large_data": "Large data",
    "non_linear": "Non-linear patterns",
    "interpretability": "Interpretability",
    "missing_handling": "Missing-value handling",
    "train_speed": "Training speed",
    "scalability": "Scalability",
    "shape_handling": "Irregular cluster shapes",
    "outlier_handling": "Outlier robustness",
    "no_components": "Auto cluster count",
    "trend_handling": "Trend modeling",
    "seasonal_handling": "Seasonality modeling",
    "data_volume": "Large data volumes",
    "non_stationarity": "Non-stationary series",
}


# =============================================================================
# Service
# =============================================================================

class AutomlService:
    """Inspect datasets, detect tasks and recommend models for them."""

    def _load_dataset(self, dataset_id: str) -> Optional[Dict[str, Any]]:
        """Validate the dataset exists and return metadata + a working DataFrame."""
        db = get_sqlite().get_session()
        try:
            dataset = db.query(DatasetModel).filter(DatasetModel.id == dataset_id).first()
            if not dataset:
                return None
            meta = {
                "id": dataset.id,
                "filename": dataset.filename,
                "num_rows": dataset.num_rows or 0,
                "num_columns": dataset.num_columns or 0,
            }
        finally:
            db.close()

        duckdb = get_duckdb()
        table = _table_name(dataset_id)
        # DuckDBClient.query already returns a pandas DataFrame (and None on
        # failure), so no .df() here.
        df = duckdb.query(f'SELECT * FROM "{table}"')
        if df is None or df.empty:
            return None
        df.columns = [str(c) for c in df.columns]
        meta["dataframe"] = df
        meta["table"] = table
        return meta

    # ------------------------------------------------------------------
    # Column analysis
    # ------------------------------------------------------------------

    def _detect_role(self, name: str, series: pd.Series, n_rows: int) -> str:
        """Classify a column into one of: numeric, boolean, categorical,
        datetime, text, id."""
        if pd.api.types.is_bool_dtype(series.dtype):
            return "boolean"
        if pd.api.types.is_datetime64_any_dtype(series.dtype):
            return "datetime"

        distinct = int(series.nunique(dropna=True))
        # Identifier-like: name signals id/uuid/key AND near-unique values.
        # Checked before the numeric branch so a numeric "student_id" is not
        # mistaken for a continuous regression target.
        if (
            re.search(r"(^|_|\.)(id|uuid|guid|key|token)($|_)", name.lower())
            and n_rows > 0
            and (distinct / n_rows) > 0.9
        ):
            return "id"

        if pd.api.types.is_numeric_dtype(series.dtype):
            return "numeric"
        # Free text: high cardinality, many distinct values.
        if distinct > 50 and n_rows > 20 and (distinct / max(n_rows, 1)) > 0.8:
            return "text"
        return "categorical"

    def _is_date_like(self, series: pd.Series) -> bool:
        """Detect string columns that parse as dates on the majority of values."""
        sample = series.dropna().astype(str).head(500)
        if sample.empty:
            return False
        # Cheap prefilter: a column that clearly isn't date-shaped skips the
        # expensive (and noisy) dateutil parse entirely. Date-ish values almost
        # always contain digits, a / - or : separator, or are short ISO forms.
        strs = sample.tolist()
        date_shaped = [
            v for v in strs
            if re.search(r"\d|[/:\-]", v) and len(v) <= 24
        ]
        if len(date_shaped) / len(strs) < 0.8:
            return False
        import warnings
        with warnings.catch_warnings():
            warnings.simplefilter("ignore")
            try:
                parsed = pd.to_datetime(pd.Series(date_shaped), errors="coerce")
            except Exception:
                return False
        ratio = float(parsed.notna().mean())
        return ratio >= 0.9

    def _analyze_columns(self, df: pd.DataFrame) -> List[Dict[str, Any]]:
        """Produce a full inventory of every column: role, stats, target signal."""
        n_rows = len(df)
        columns: List[Dict[str, Any]] = []

        for name in df.columns:
            series = df[name]
            missing = int(series.isna().sum())
            missing_pct = round(float(missing / n_rows) * 100, 2) if n_rows else 0.0
            distinct = int(series.nunique(dropna=True))
            unique_ratio = round(distinct / n_rows, 4) if n_rows else 0.0

            role = self._detect_role(name, series, n_rows)
            if role == "datetime":
                pass
            elif role == "categorical" and self._is_date_like(series):
                role = "datetime"

            cardinality = "low" if distinct <= 10 else ("medium" if distinct <= 100 else "high")

            col: Dict[str, Any] = {
                "name": name,
                "dtype": str(series.dtype),
                "role": role,
                "missing": missing,
                "missing_pct": missing_pct,
                "distinct": distinct,
                "unique_ratio": unique_ratio,
                "cardinality": cardinality,
            }

            if role == "numeric":
                try:
                    num = pd.to_numeric(series, errors="coerce")
                    col["stats"] = {
                        "mean": _to_native(float(num.mean())) if not np.isnan(num.mean()) else None,
                        "median": _to_native(float(num.median())) if not np.isnan(num.median()) else None,
                        "min": _to_native(float(num.min())) if not np.isnan(num.min()) else None,
                        "max": _to_native(float(num.max())) if not np.isnan(num.max()) else None,
                        "std": _to_native(float(num.std())) if not np.isnan(num.std()) else None,
                    }
                except Exception:
                    col["stats"] = {}

            columns.append(col)
        return columns

    # ------------------------------------------------------------------
    # Target scoring + task detection
    # ------------------------------------------------------------------

    def _score_target(self, col: Dict[str, Any], df: pd.DataFrame) -> Tuple[float, Optional[str], str]:
        """Return (suitability 0-1, suggested task, human reason)."""
        name = col["name"]
        role = col["role"]
        distinct = col["distinct"]
        missing_pct = col["missing_pct"]
        n_rows = len(df)

        if role in ("id", "datetime", "text"):
            hints = {
                "id": "Identifier columns carry no predictive signal — not a valid target.",
                "datetime": "Timestamp columns are time axes, not targets. Use one as the time column for forecasting.",
                "text": "Free-text columns need encoding first — not recommended as a target.",
            }
            return 0.0, None, hints[role]

        if distinct <= 1:
            return 0.0, None, "Constant column — no variance to predict."

        missing_penalty = 1.0 - min(missing_pct, 50) / 100.0

        if role == "numeric":
            if distinct <= 2:
                task = "classification"
                conf = 0.95
                reason = f"Binary numeric target ({distinct} distinct values) → binary classification."
            elif distinct <= _REGRESSION_MIN_DISTINCT:
                task = "classification"
                conf = 0.90
                reason = f"Discrete numeric target with {distinct} classes → classification."
            elif (distinct / max(n_rows, 1)) <= 0.03:
                task = "classification"
                conf = 0.80
                reason = f"Few distinct values ({distinct}) relative to {n_rows} rows → grouped/ordinal target."
            else:
                task = "regression"
                conf = 0.92
                reason = f"Continuous numeric target with {distinct} distinct values → regression."

        elif role in ("boolean", "categorical"):
            if distinct == 2:
                task = "classification"
                conf = 0.96
                reason = f"Binary categorical target with {distinct} classes → binary classification."
            elif distinct <= 20:
                task = "classification"
                conf = 0.88
                reason = f"Categorical target with {distinct} classes → multi-class classification."
            else:
                task = "classification"
                conf = 0.55
                reason = f"High-cardinality categorical target ({distinct} classes) — grouping classes first would help."
        else:
            return 0.0, None, "Unsupported column type for a target."

        suitability = round(max(0.0, min(0.99, conf * missing_penalty)), 2)
        return suitability, task, reason

    def _class_balance(self, series: pd.Series) -> Optional[Dict[str, Any]]:
        """For classification targets, report class distribution signal."""
        try:
            counts = series.value_counts(dropna=True, normalize=True)
            if counts.empty:
                return None
            top = float(counts.iloc[0])
            n_classes = int(len(counts))
            return {
                "n_classes": n_classes,
                "majority_ratio": round(top, 3),
                "balanced": top < 0.65,
            }
        except Exception:
            return None

    def _detect_tasks(self, df: pd.DataFrame, columns: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Detect viable ML tasks with confidence and supporting evidence."""
        scored: List[Dict[str, Any]] = []
        for col in columns:
            if col["role"] in ("numeric", "boolean", "categorical"):
                suitability, task, reason = self._score_target(col, df)
                if task and suitability > 0:
                    scored.append({**col, "suitability": suitability, "task": task, "reason": reason})

        best_class = next((s for s in scored if s["task"] == "classification"), None)
        best_reg = next((s for s in scored if s["task"] == "regression"), None)

        tasks: List[Dict[str, Any]] = []

        # ── Classification ──
        if best_class:
            balance = self._class_balance(df[best_class["name"]]) if best_class["role"] in ("boolean", "categorical") else None
            conf = round(best_class["suitability"] * (0.9 if (balance and not balance["balanced"]) else 1.0), 2)
            note = ""
            if balance and not balance["balanced"]:
                note = f" Classes are imbalanced (majority {balance['majority_ratio']:.0%}) — prefer F1/ROC-AUC."
            tasks.append({
                "task": "classification",
                "confidence": conf,
                "target": best_class["name"],
                "reason": best_class["reason"] + note,
            })

        # ── Regression ──
        if best_reg:
            tasks.append({
                "task": "regression",
                "confidence": best_reg["suitability"],
                "target": best_reg["name"],
                "reason": best_reg["reason"],
            })

        # ── Time series ──
        datetime_cols = [c for c in columns if c["role"] == "datetime"]
        if datetime_cols and (best_reg or best_class):
            time_col = max(datetime_cols, key=lambda c: c["distinct"])
            series_col = best_reg["name"] if best_reg else best_class["name"]
            ts_conf = 0.78 if best_reg else 0.6
            tasks.append({
                "task": "time_series",
                "confidence": round(ts_conf, 2),
                "target": series_col,
                "time_column": time_col["name"],
                "reason": f"Column '{time_col['name']}' is a timestamp with {time_col['distinct']} points — forecast '{series_col}' over time.",
            })

        # ── Clustering ──
        best_super = max((s["suitability"] for s in scored), default=0.0)
        n_feature_worthy = sum(1 for c in columns if c["role"] in ("numeric", "categorical", "boolean"))
        if best_super < 0.55 and n_feature_worthy >= 2:
            tasks.append({
                "task": "clustering",
                "confidence": round(min(0.85, 0.5 + (1 - best_super) * 0.4), 2),
                "target": None,
                "reason": f"No strong labeled target detected (best suitability {best_super:.0%}) — unsupervised segmentation is a good fit.",
            })

        # Sort by confidence, ensure at least clustering is offered when empty.
        tasks.sort(key=lambda t: t["confidence"], reverse=True)
        if not tasks and n_feature_worthy >= 2:
            tasks.append({
                "task": "clustering",
                "confidence": 0.7,
                "target": None,
                "reason": "No obvious labeled target — explore unsupervised segmentation.",
            })

        scored.sort(key=lambda s: s["suitability"], reverse=True)
        return {
            "tasks": tasks,
            "candidates": scored,
            "best_target": best_super,
            "n_feature_worthy": n_feature_worthy,
        }

    # ------------------------------------------------------------------
    # Public: inspect
    # ------------------------------------------------------------------

    def inspect_dataset(self, dataset_id: str) -> Optional[Dict[str, Any]]:
        """Full automated dataset inspection."""
        loaded = self._load_dataset(dataset_id)
        if not loaded:
            return None

        df = loaded["dataframe"]
        n_rows = len(df)

        # Deterministic sample for cheap per-column stats on huge tables.
        work_df = df
        if n_rows > HEURISTIC_SAMPLE_CAP:
            work_df = df.sample(HEURISTIC_SAMPLE_CAP, random_state=42)

        columns = self._analyze_columns(work_df)
        detected = self._detect_tasks(df, columns)

        # Recompute distinct counts against the true table for reported numbers.
        for col in columns:
            col["distinct_true"] = int(df[col["name"]].nunique(dropna=True))
            col["missing_true"] = int(df[col["name"]].isna().sum())

        # Candidate targets ranked by suitability. The scored entries live in
        # detected["candidates"] (columns themselves never carry task data).
        true_distinct = {c["name"]: c["distinct_true"] for c in columns}
        candidate_targets = [
            {
                "column": c["name"],
                "role": c["role"],
                "suitability": c["suitability"],
                "task": c["task"],
                "reason": c["reason"],
                "missing_pct": c["missing_pct"],
                "distinct": true_distinct.get(c["name"], c.get("distinct", 0)),
            }
            for c in detected.get("candidates", [])
            if c.get("task") and c.get("suitability", 0) > 0
        ]
        candidate_targets.sort(key=lambda t: t["suitability"], reverse=True)

        # Data quality summary.
        missing_cols = [c for c in columns if c["missing_pct"] > 0]
        quality = {
            "total_missing": int(sum(c["missing_true"] for c in columns)),
            "missing_columns": len(missing_cols),
            "health_score": round(self._health_score(work_df, columns), 1),
            "notes": self._quality_notes(columns),
        }

        best = detected["tasks"][0] if detected["tasks"] else None
        summary = self._build_summary(loaded, df, columns, detected, best)

        return {
            "dataset_id": dataset_id,
            "filename": loaded["filename"],
            "shape": {"rows": n_rows, "columns": len(columns)},
            "columns": columns,
            "detected_tasks": detected["tasks"],
            "candidate_targets": candidate_targets,
            "data_quality": quality,
            "recommendation": {
                "task": best["task"] if best else None,
                "target": best.get("target") if best else None,
                "time_column": best.get("time_column") if best else None,
                "message": best["reason"] if best else "No clear modeling path detected.",
            },
            "summary": summary,
        }

    def _health_score(self, df: pd.DataFrame, columns: List[Dict[str, Any]]) -> float:
        """Lightweight data-quality score mirroring the profiling agent's spirit."""
        n_rows = len(df)
        scores = []
        for c in columns:
            completeness = 1.0 - (c["missing_pct"] / 100.0)
            consistency = 0.8 if c["role"] != "text" else 0.6
            scores.append(completeness * consistency)
        if not scores:
            return 0.0
        return min(100.0, sum(scores) / len(scores) * 100.0)

    def _quality_notes(self, columns: List[Dict[str, Any]]) -> List[str]:
        notes = []
        missing = [c for c in columns if c["missing_pct"] > 0]
        if missing:
            top = sorted(missing, key=lambda c: c["missing_pct"], reverse=True)[:3]
            notes.append(
                f"{len(missing)} columns have missing values (worst: "
                + ", ".join(f"{c['name']} {c['missing_pct']:.0f}%" for c in top)
                + ")."
            )
        else:
            notes.append("No missing values detected — clean input for modeling.")
        text = [c for c in columns if c["role"] == "text"]
        if text:
            notes.append(f"{len(text)} free-text column(s) will need encoding before supervised modeling.")
        ids = [c for c in columns if c["role"] == "id"]
        if ids:
            notes.append(f"{len(ids)} identifier column(s) excluded automatically from modeling.")
        return notes

    def _build_summary(
        self,
        loaded: Dict[str, Any],
        df: pd.DataFrame,
        columns: List[Dict[str, Any]],
        detected: Dict[str, Any],
        best: Optional[Dict[str, Any]],
    ) -> str:
        n_rows = loaded["num_rows"]
        n_num = sum(1 for c in columns if c["role"] == "numeric")
        n_cat = sum(1 for c in columns if c["role"] in ("categorical", "boolean"))
        n_dt = sum(1 for c in columns if c["role"] == "datetime")
        parts = [
            f"{n_rows:,} rows × {len(columns)} columns",
            f"{n_num} numeric",
            f"{n_cat} categorical",
            f"{n_dt} datetime",
        ]
        head = " · ".join(parts)
        if best:
            tail = f" Strongest signal: predict '{best.get('target')}' via {best['task'].replace('_', ' ')}."
        else:
            tail = " No strong labeled signal found."
        return head + tail

    # ------------------------------------------------------------------
    # Public: recommend models
    # ------------------------------------------------------------------

    def recommend_models(
        self,
        dataset_id: str,
        target: Optional[str] = None,
        task: Optional[str] = None,
    ) -> Optional[Dict[str, Any]]:
        """Recommend the best models for a dataset, optionally honoring a
        user-chosen target column and/or task override."""
        loaded = self._load_dataset(dataset_id)
        if not loaded:
            return None

        df = loaded["dataframe"]
        n_rows = len(df)
        n_cols = len(df.columns)

        columns = self._analyze_columns(df)
        detected = self._detect_tasks(df, columns)

        # Resolve the effective task + target. Clustering is unsupervised, so it
        # never carries a target — an explicit task override must win over the
        # auto-detected (supervised) target even when none was supplied.
        if task and task not in ("regression", "classification", "clustering", "time_series"):
            raise ValueError(f"Unknown task: {task}")

        # If the user forced an unsupervised task, drop the target entirely.
        if task in ("clustering", "time_series") and not target:
            resolved_task = task
            resolved_target = None
        elif target:
            if target not in df.columns:
                raise ValueError(f"Target column '{target}' not found in dataset")
            col = next((c for c in columns if c["name"] == target), None)
            if task:
                resolved_task = task
            elif col and col["role"] in ("numeric", "boolean", "categorical"):
                _, resolved_task, _ = self._score_target(col, df)
                if not resolved_task:
                    resolved_task = "classification"
            else:
                resolved_task = "regression"
            resolved_target = target
        else:
            best = detected["tasks"][0] if detected["tasks"] else None
            resolved_task = best["task"] if best else "clustering"
            resolved_target = best.get("target") if best else None
            if resolved_task == "time_series":
                resolved_task = "regression"

        if resolved_task not in _SUPERVISED_MODELS:
            raise ValueError(f"No model library for task: {resolved_task}")

        # Numeric feature columns used for the dataset profile.
        numeric_cols = [c["name"] for c in columns if c["role"] == "numeric"]
        if resolved_target in numeric_cols:
            numeric_cols = [c for c in numeric_cols if c != resolved_target]

        profile = self._dataset_profile(df, numeric_cols, columns)
        model_rows = _SUPERVISED_MODELS[resolved_task]

        if resolved_task == "time_series":
            datetime_cols = [c["name"] for c in columns if c["role"] == "datetime"]
            time_column = datetime_cols[0] if datetime_cols else None
            resolved_target = resolved_target or numeric_cols[0] if numeric_cols else None
        else:
            time_column = None

        # Score every candidate model against the dataset profile.
        ranked = []
        for m in model_rows:
            caps = m["capabilities"]
            used_caps = _CAP_DEFS["time_series"] if resolved_task == "time_series" else (
                _CAP_DEFS["supervised"] if resolved_task != "clustering" else _CAP_DEFS["clustering"]
            )
            weights = {k: profile.get(k, 0.5) for k in used_caps}
            wsum = sum(weights.values()) or 1.0
            base = sum(caps.get(k, 0) * weights[k] for k in used_caps) / wsum

            # Ensemble edge: bagging/boosting reduce variance, so an ensemble
            # is a strictly more robust pick than an otherwise-equal single
            # model (e.g. Random Forest vs one Decision Tree). Kept small so
            # it only breaks genuine near-ties.
            variance_bonus = 3 if m["family"] == "ensemble" else 0
            score = int(round(base + variance_bonus))

            why = self._model_rationale(m, profile, resolved_task, resolved_target, n_rows, n_cols)
            ranked.append({
                "id": m["id"],
                "name": m["name"],
                "family": m["family"],
                "tier": m["tier"],
                "trainable": m["trainable"],
                "score": score,
                "tags": m["tags"],
                "metrics": m["metrics"],
                "best_for": m["best_for"],
                "tradeoffs": m["tradeoffs"],
                "requires": m.get("requires"),
                "rationale": why["text"],
                "why": why["points"],
                "capability_breakdown": {
                    k: {"label": _METRIC_LABELS.get(k, k), "score": caps.get(k, 0), "weight": round(weights[k], 2)}
                    for k in used_caps
                },
            })

        # Tier priority for ties — a 'recommended' ensemble beats a
        # 'baseline'/'alternative' model with the same score, so the top pick
        # is the robust choice, not merely the first one in the catalog.
        tier_priority = {"recommended": 0, "specialist": 1, "baseline": 2, "alternative": 3}
        ranked.sort(
            key=lambda r: (r["score"], -tier_priority.get(r["tier"], 4)),
            reverse=True,
        )
        for i, r in enumerate(ranked):
            r["rank"] = i + 1

        baseline = next((r for r in ranked if r["tier"] == "baseline"), None)
        top = ranked[0] if ranked else None

        performance = self._estimate_performance(df, resolved_target, resolved_task, columns)

        return {
            "dataset_id": dataset_id,
            "filename": loaded["filename"],
            "task": resolved_task,
            "target": resolved_target,
            "time_column": time_column,
            "n_rows": n_rows,
            "n_features": n_cols - (1 if resolved_target else 0),
            "profile": {k: round(v, 2) for k, v in profile.items()},
            "recommended_model": top["id"] if top else None,
            "performance_estimate": performance,
            "models": ranked,
            "baseline": {
                "id": baseline["id"] if baseline else None,
                "name": baseline["name"] if baseline else None,
                "score": baseline["score"] if baseline else None,
            },
            "why_top": top["rationale"] if top else None,
        }

    def _dataset_profile(
        self,
        df: pd.DataFrame,
        numeric_cols: List[str],
        columns: List[Dict[str, Any]],
    ) -> Dict[str, float]:
        """Turn dataset characteristics into a profile that weights the
        capability attributes for scoring."""
        n_rows = len(df)
        n_features = len(df.columns)

        small_w = 0.9 if n_rows < 1000 else (0.55 if n_rows < 10_000 else (0.25 if n_rows < 100_000 else 0.1))
        large_w = round(1.0 - small_w, 2)

        # Non-linearity proxy from mean pairwise |correlation| among numerics.
        nl_est = 0.5
        if len(numeric_cols) >= 2:
            try:
                corr = df[numeric_cols].corr(numeric=True).abs()
                mask = np.triu(np.ones(corr.shape, dtype=bool), k=1)
                vals = corr.to_numpy()[mask]
                vals = vals[~np.isnan(vals)]
                if len(vals):
                    mean_corr = float(vals.mean())
                    nl_est = float(np.clip(0.35 + (1.0 - mean_corr) * 0.7, 0.15, 0.95))
            except Exception:
                pass
        if n_features >= 10:
            nl_est = min(0.98, nl_est + 0.08)

        missing_cols = [c for c in columns if c["missing_pct"] > 0]
        avg_missing = sum(c["missing_pct"] for c in missing_cols) / max(len(columns), 1)
        missing_w = min(1.0, avg_missing / 15.0)

        return {
            "small_data": small_w,
            "large_data": large_w,
            "non_linear": round(nl_est, 2),
            "interpretability": 0.3,  # enterprise default preference
            "missing_handling": round(missing_w, 2),
            "train_speed": round(min(1.0, (n_rows * max(n_features, 1)) / 1_000_000), 2),
            "n_rows": n_rows,
            "n_features": n_features,
        }

    def _model_rationale(
        self,
        model: Dict[str, Any],
        profile: Dict[str, float],
        task: str,
        target: Optional[str],
        n_rows: int,
        n_cols: int,
    ) -> Dict[str, Any]:
        """Generate the data-driven 'why this model' explanation."""
        caps = model["capabilities"]
        points: List[str] = []
        size_label = "small" if n_rows < 1000 else ("medium" if n_rows < 50_000 else "large")
        feat_label = f"{n_cols} columns"

        if profile["small_data"] >= 0.55 and caps.get("small_data", 0) >= 80:
            points.append(
                f"With only {n_rows:,} rows you're in {size_label}-data territory — {model['name']} "
                f"generalizes well here without the overfitting risk of more complex models."
            )
        if profile["large_data"] >= 0.55 and caps.get("large_data", 0) >= 80:
            points.append(
                f"At {n_rows:,} rows, {model['name']} scales comfortably to {size_label} data."
            )
        if caps.get("non_linear", 0) >= 80 and profile["non_linear"] >= 0.55:
            points.append(
                f"Your features show low pairwise linear correlation ({profile['non_linear']:.0%} non-linearity "
                f"signal) — {model['name']}'s non-linear capacity is a strong match for {feat_label}."
            )
        if profile["missing_handling"] >= 0.4 and caps.get("missing_handling", 0) >= 75:
            points.append(
                f"About {profile['missing_handling'] * 100:.0f}% of cells are missing — {model['name']} "
                f"handles missing values natively, saving imputation engineering."
            )
        if caps.get("interpretability", 0) >= 80 and profile["interpretability"] >= 0.3:
            points.append(
                f"Enterprise-friendly: {model['name']} stays interpretable, which eases audit and stakeholder review."
            )
        if caps.get("train_speed", 0) >= 85 and profile["train_speed"] >= 0.5:
            points.append(f"Trains quickly at this scale, so iteration on features is cheap.")

        if not points:
            points.append(
                f"{model['name']} is a balanced {model['family']} choice for this {size_label} dataset "
                f"({feat_label})."
            )

        focus = f" targeting '{target}'" if target else ""
        text = f"Recommended for your {size_label} dataset ({feat_label}){focus} — " + (
            " ".join(points[:2]) if len(points) > 2 else " ".join(points)
        )
        return {"text": text, "points": points}

    def _estimate_performance(
        self,
        df: pd.DataFrame,
        target: Optional[str],
        task: str,
        columns: List[Dict[str, Any]],
    ) -> Dict[str, Any]:
        """Heuristic expected-performance band (clearly labeled as an estimate)."""
        n = len(df)
        score = 0.5
        factors: List[str] = []

        if n >= 5000:
            score += 0.12
            factors.append(f"{n:,} rows provide strong coverage of feature space")
        elif n >= 500:
            score += 0.06
            factors.append(f"{n:,} rows are adequate for this task")
        else:
            score -= 0.12
            factors.append(f"Only {n:,} rows — expect variance; more data would stabilize results")

        if target and target in df.columns:
            series = df[target]
            if task == "classification":
                counts = series.value_counts(dropna=True, normalize=True)
                if len(counts) >= 2:
                    top = float(counts.iloc[0])
                    if top < 0.65:
                        score += 0.08
                        factors.append("Classes are reasonably balanced")
                    elif top < 0.8:
                        factors.append("Moderate class imbalance — prefer F1 / ROC-AUC over accuracy")
                    else:
                        score -= 0.12
                        factors.append(f"Strong class imbalance ({top:.0%} majority) will cap accuracy")
            elif task == "regression":
                try:
                    var = float(series.dropna().var())
                    if var > 0:
                        factors.append("Target has meaningful variance to model")
                    else:
                        score -= 0.1
                        factors.append("Target variance is very low — predictions will be near the mean")
                except Exception:
                    pass

        missing = sum(c["missing_pct"] for c in columns) / max(len(columns), 1)
        if missing > 20:
            score -= 0.08
            factors.append(f"High missingness ({missing:.0f}%) will add noise unless handled")
        elif missing == 0:
            score += 0.04
            factors.append("No missing values to impute")

        score = float(np.clip(score, 0.15, 0.95))
        band = [round(max(0.0, score - 0.1), 2), round(min(1.0, score + 0.12), 2)]
        quality = "excellent" if score >= 0.72 else ("good" if score >= 0.55 else "fair")
        return {
            "quality": quality,
            "band": band,
            "score": round(score, 2),
            "factors": factors,
            "disclaimer": "Heuristic estimate from dataset characteristics, not a trained evaluation.",
        }

    # ------------------------------------------------------------------
    # Optional sklearn-backed training / prediction (graceful if absent)
    # ------------------------------------------------------------------

    def _sklearn_available(self) -> Tuple[bool, str]:
        try:
            import sklearn  # noqa: F401
            return True, ""
        except ImportError:
            return False, (
                "Model training requires scikit-learn, which is not installed. "
                "Run `pip install scikit-learn` in the backend environment, then retry."
            )

    def train_model(
        self,
        dataset_id: str,
        target: str,
        task: str,
        model_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Train a model on the dataset and report validation metrics.

        Works end-to-end when scikit-learn is installed; otherwise returns a
        structured error so the UI can surface the exact install step.
        """
        ok, err = self._sklearn_available()
        if not ok:
            return {
                "success": False,
                "error": err,
                "code": "SKLEARN_MISSING",
            }

        loaded = self._load_dataset(dataset_id)
        if not loaded:
            return {"success": False, "error": "Dataset not found", "code": "NOT_FOUND"}
        df = loaded["dataframe"]
        if target not in df.columns:
            return {"success": False, "error": f"Target column '{target}' missing", "code": "TARGET_MISSING"}

        try:
            import sklearn
            from sklearn.compose import ColumnTransformer
            from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor
            from sklearn.impute import SimpleImputer
            from sklearn.linear_model import LinearRegression, LogisticRegression
            from sklearn.metrics import accuracy_score, f1_score, r2_score, mean_absolute_error, precision_score, recall_score
            from sklearn.model_selection import train_test_split
            from sklearn.pipeline import Pipeline
            from sklearn.preprocessing import OneHotEncoder, StandardScaler
            from sklearn.cluster import KMeans
        except ImportError as e:
            return {"success": False, "error": f"scikit-learn import failed: {e}", "code": "SKLEARN_MISSING"}

        columns = self._analyze_columns(df)
        if task not in ("regression", "classification"):
            return {"success": False, "error": "Training currently supports regression and classification.", "code": "UNSUPPORTED_TASK"}

        y = df[target]
        feature_cols = [c["name"] for c in columns if c["role"] in ("numeric", "categorical", "boolean") and c["name"] != target]

        if task == "classification" and y.dtype != object:
            y = y.astype(str)

        num_cols = [c for c in feature_cols if c in [x["name"] for x in columns if x["role"] == "numeric"]]
        cat_cols = [c for c in feature_cols if c not in num_cols]

        preprocessor = ColumnTransformer([
            ("num", Pipeline([("impute", SimpleImputer(strategy="median")), ("scale", StandardScaler())]), num_cols),
            ("cat", Pipeline([("impute", SimpleImputer(strategy="most_frequent")), ("onehot", OneHotEncoder(handle_unknown="ignore"))]), cat_cols),
        ])

        if task == "classification":
            estimator = {
                "logistic_regression": LogisticRegression(max_iter=2000),
                "random_forest_classifier": RandomForestClassifier(n_estimators=200, random_state=42),
            }.get(model_id or "random_forest_classifier", RandomForestClassifier(n_estimators=200, random_state=42))
            scoring = "accuracy"
        else:
            estimator = {
                "linear_regression": LinearRegression(),
                "random_forest_regressor": RandomForestRegressor(n_estimators=200, random_state=42),
            }.get(model_id or "random_forest_regressor", RandomForestRegressor(n_estimators=200, random_state=42))
            scoring = "r2"

        pipe = Pipeline([("preprocess", preprocessor), ("model", estimator)])

        X = df[feature_cols]
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=42, stratify=(y if task == "classification" else None)
        )

        pipe.fit(X_train, y_train)
        pred = pipe.predict(X_test)

        if task == "classification":
            metrics = {
                "accuracy": round(float(accuracy_score(y_test, pred)), 4),
                "f1": round(float(f1_score(y_test, pred, average="weighted", zero_division=0)), 4),
                "precision": round(float(precision_score(y_test, pred, average="weighted", zero_division=0)), 4),
                "recall": round(float(recall_score(y_test, pred, average="weighted", zero_division=0)), 4),
            }
        else:
            metrics = {
                "r2": round(float(r2_score(y_test, pred)), 4),
                "mae": round(float(mean_absolute_error(y_test, pred)), 4),
            }

        model_name = type(estimator).__name__

        return {
            "success": True,
            "dataset_id": dataset_id,
            "target": target,
            "task": task,
            "model_id": model_id or model_name,
            "model_name": model_name,
            "metrics": metrics,
            "scoring": scoring,
            "n_train": int(len(X_train)),
            "n_test": int(len(X_test)),
            "features_used": len(feature_cols),
            "message": f"Trained {model_name} on {len(X_train)} rows and validated on {len(X_test)}.",
        }


automl_service = AutomlService()
