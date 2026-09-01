"""
Training Pipeline Service
Enterprise AI Data Analyst - Multi-Model Automated Training

Runs a complete supervised-learning training pipeline against a dataset:

  1. Auto-detects (or honors) the ML task + target column.
  2. Prepares a numeric/categorical feature matrix (impute + encode + scale).
  3. Trains every compatible model from the catalog (Random Forest, XGBoost,
     LightGBM, CatBoost, Decision Tree, Logistic/Linear Regression, SVM, KNN,
     Naive Bayes) on a stratified 80/20 split.
  4. Reports standard metrics (accuracy / precision / recall / F1 / ROC AUC
     for classification; R2 / RMSE / MAE / MAPE for regression) plus training
     time, prediction time and memory usage.
  5. Picks the best model, persists the whole run to SQLite, and returns a
     structured result the UI can render.

Optional packages (xgboost, lightgbm, catboost, psutil) are imported lazily
inside model factories / guards, so their absence never breaks the pipeline —
those models are simply reported as unavailable (same contract as the existing
automl service's SKLEARN_MISSING handling).
"""
from __future__ import annotations

import time
import uuid
from typing import Any, Callable, Dict, List, Optional, Tuple

import numpy as np
import pandas as pd

from app.database.duckdb_client import get_duckdb
from app.database.sqlite_client import get_sqlite
from app.database.models import Dataset as DatasetModel
from app.database.models import TrainingRun
from app.services.automl_service import automl_service
from app.utils.logger import logger

# Largest model set we ever train per run (per task).
CLASSIFICATION_MODELS = 9
REGRESSION_MODELS = 8


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
# Availability guards
# =============================================================================

def _sklearn_available() -> Tuple[bool, str]:
    try:
        import sklearn  # noqa: F401
        return True, ""
    except ImportError:
        return False, (
            "scikit-learn is not installed. Run `pip install scikit-learn` in the "
            "backend environment, then retry."
        )


def _psutil_available() -> bool:
    try:
        import psutil  # noqa: F401
        return True
    except ImportError:
        return False


# =============================================================================
# Model catalog — lazy factories so missing packages never break startup
# =============================================================================

#: (id, display name, factory, extra dependencies description)
#: The factory must import its estimator inside the closure.
_CLASSIFIERS: List[Dict[str, Any]] = [
    {
        "id": "logistic_regression",
        "name": "Logistic Regression",
        "requires": "sklearn",
        "factory": lambda: _sklearn_factory("logistic"),
    },
    {
        "id": "naive_bayes",
        "name": "Naive Bayes",
        "requires": "sklearn",
        "factory": lambda: _sklearn_factory("naive_bayes"),
    },
    {
        "id": "knn",
        "name": "K-Nearest Neighbors",
        "requires": "sklearn",
        "factory": lambda: _sklearn_factory("knn_classifier"),
    },
    {
        "id": "svm",
        "name": "Support Vector Machine",
        "requires": "sklearn",
        "factory": lambda: _sklearn_factory("svm_classifier"),
    },
    {
        "id": "decision_tree",
        "name": "Decision Tree",
        "requires": "sklearn",
        "factory": lambda: _sklearn_factory("decision_tree_classifier"),
    },
    {
        "id": "random_forest",
        "name": "Random Forest",
        "requires": "sklearn",
        "factory": lambda: _sklearn_factory("random_forest_classifier"),
    },
    {
        "id": "xgboost",
        "name": "XGBoost",
        "requires": "xgboost",
        "factory": lambda: _sklearn_factory("xgboost_classifier"),
    },
    {
        "id": "lightgbm",
        "name": "LightGBM",
        "requires": "lightgbm",
        "factory": lambda: _sklearn_factory("lightgbm_classifier"),
    },
    {
        "id": "catboost",
        "name": "CatBoost",
        "requires": "catboost",
        "factory": lambda: _sklearn_factory("catboost_classifier"),
    },
]

_REGRESSORS: List[Dict[str, Any]] = [
    {
        "id": "linear_regression",
        "name": "Linear Regression",
        "requires": "sklearn",
        "factory": lambda: _sklearn_factory("linear"),
    },
    {
        "id": "knn",
        "name": "K-Nearest Neighbors",
        "requires": "sklearn",
        "factory": lambda: _sklearn_factory("knn_regressor"),
    },
    {
        "id": "svm",
        "name": "Support Vector Machine",
        "requires": "sklearn",
        "factory": lambda: _sklearn_factory("svm_regressor"),
    },
    {
        "id": "decision_tree",
        "name": "Decision Tree",
        "requires": "sklearn",
        "factory": lambda: _sklearn_factory("decision_tree_regressor"),
    },
    {
        "id": "random_forest",
        "name": "Random Forest",
        "requires": "sklearn",
        "factory": lambda: _sklearn_factory("random_forest_regressor"),
    },
    {
        "id": "xgboost",
        "name": "XGBoost",
        "requires": "xgboost",
        "factory": lambda: _sklearn_factory("xgboost_regressor"),
    },
    {
        "id": "lightgbm",
        "name": "LightGBM",
        "requires": "lightgbm",
        "factory": lambda: _sklearn_factory("lightgbm_regressor"),
    },
    {
        "id": "catboost",
        "name": "CatBoost",
        "requires": "catboost",
        "factory": lambda: _sklearn_factory("catboost_regressor"),
    },
]


def _catalog(task: str) -> List[Dict[str, Any]]:
    if task == "classification":
        return _CLASSIFIERS
    if task == "regression":
        return _REGRESSORS
    raise ValueError(f"Unknown task: {task}")


def _sklearn_factory(kind: str) -> Any:
    """Build a concrete estimator, importing sklearn (and optional libs) lazily."""
    from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor
    from sklearn.linear_model import LinearRegression, LogisticRegression
    from sklearn.naive_bayes import GaussianNB
    from sklearn.neighbors import KNeighborsClassifier, KNeighborsRegressor
    from sklearn.svm import SVC, SVR
    from sklearn.tree import DecisionTreeClassifier, DecisionTreeRegressor

    if kind == "logistic":
        return LogisticRegression(max_iter=2000, n_jobs=-1)
    if kind == "naive_bayes":
        return GaussianNB()
    if kind == "knn_classifier":
        return KNeighborsClassifier(n_neighbors=5)
    if kind == "knn_regressor":
        return KNeighborsRegressor(n_neighbors=5)
    if kind == "svm_classifier":
        return SVC(probability=True, random_state=42)  # probability=True → ROC AUC
    if kind == "svm_regressor":
        return SVR()
    if kind == "decision_tree_classifier":
        return DecisionTreeClassifier(random_state=42)
    if kind == "decision_tree_regressor":
        return DecisionTreeRegressor(random_state=42)
    if kind == "random_forest_classifier":
        return RandomForestClassifier(n_estimators=200, random_state=42, n_jobs=-1)
    if kind == "random_forest_regressor":
        return RandomForestRegressor(n_estimators=200, random_state=42, n_jobs=-1)
    if kind == "xgboost_classifier":
        import xgboost
        return xgboost.XGBClassifier(
            n_estimators=200, random_state=42, eval_metric="logloss", verbosity=0
        )
    if kind == "xgboost_regressor":
        import xgboost
        return xgboost.XGBRegressor(
            n_estimators=200, random_state=42, verbosity=0
        )
    if kind == "lightgbm_classifier":
        import lightgbm
        return lightgbm.LGBMClassifier(
            n_estimators=200, random_state=42, verbose=-1, n_jobs=-1
        )
    if kind == "lightgbm_regressor":
        import lightgbm
        return lightgbm.LGBMRegressor(
            n_estimators=200, random_state=42, verbose=-1, n_jobs=-1
        )
    if kind == "catboost_classifier":
        import catboost
        return catboost.CatBoostClassifier(
            iterations=200, random_state=42, verbose=0, allow_writing_files=False
        )
    if kind == "catboost_regressor":
        import catboost
        return catboost.CatBoostRegressor(
            iterations=200, random_state=42, verbose=0, allow_writing_files=False
        )
    raise ValueError(f"Unknown estimator kind: {kind}")


# =============================================================================
# Service
# =============================================================================

class TrainingService:
    """Runs the multi-model training pipeline and persists run results."""

    # ------------------------------------------------------------------
    # Dataset loading (same convention as automl_service)
    # ------------------------------------------------------------------

    def _load_dataset(self, dataset_id: str) -> Optional[Dict[str, Any]]:
        """Validate the dataset exists and return metadata + a DataFrame."""
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
        df = duckdb.query(f'SELECT * FROM "{table}"')
        if df is None or df.empty:
            return None
        df.columns = [str(c) for c in df.columns]
        meta["dataframe"] = df
        meta["table"] = table
        return meta

    def _resolve_task_target(
        self, dataset_id: str, df: pd.DataFrame, target: Optional[str], task: Optional[str]
    ) -> Tuple[str, str]:
        """Resolve the effective (task, target), auto-detecting when omitted."""
        columns = automl_service._analyze_columns(df)  # reuse existing utility

        if task and task not in ("regression", "classification"):
            raise ValueError(f"Training currently supports regression and classification, not '{task}'.")

        if target:
            if target not in df.columns:
                raise ValueError(f"Target column '{target}' not found in dataset")
            col = next((c for c in columns if c["name"] == target), None)
            if task:
                resolved_task = task
            elif col and col["role"] in ("numeric", "boolean", "categorical"):
                _, resolved_task, _ = automl_service._score_target(col, df)
                if not resolved_task:
                    resolved_task = "classification"
            else:
                resolved_task = "regression"
            return resolved_task, target

        # Auto-detect from the automl inspect path.
        inspect = automl_service.inspect_dataset(dataset_id)
        best = None
        if inspect:
            best = (inspect.get("detected_tasks") or [None])[0]
        if best and best.get("task") in ("classification", "regression"):
            return best["task"], best.get("target") or ""
        # Fall back to the first viable candidate.
        if inspect and inspect.get("candidate_targets"):
            c = inspect["candidate_targets"][0]
            return c["task"] if c["task"] in ("classification", "regression") else "classification", c["column"]
        raise ValueError("No viable supervised target detected — no labeled column found.")

    # ------------------------------------------------------------------
    # Feature preparation
    # ------------------------------------------------------------------

    def _feature_columns(self, df: pd.DataFrame, target: str) -> Tuple[List[str], List[str]]:
        """Split feature columns into numeric vs categorical (excludes target)."""
        columns = automl_service._analyze_columns(df)
        feature_cols = [
            c["name"]
            for c in columns
            if c["role"] in ("numeric", "categorical", "boolean") and c["name"] != target
        ]
        num_cols = [c for c in columns if c["role"] == "numeric" and c["name"] != target]
        num_names = [c["name"] for c in num_cols]
        cat_cols = [c for c in feature_cols if c not in num_names]
        return num_names, cat_cols

    def _make_preprocessor(self, num_cols: List[str], cat_cols: List[str]) -> Any:
        from sklearn.compose import ColumnTransformer
        from sklearn.impute import SimpleImputer
        from sklearn.pipeline import Pipeline
        from sklearn.preprocessing import OneHotEncoder, StandardScaler

        return ColumnTransformer([
            (
                "num",
                Pipeline([
                    ("impute", SimpleImputer(strategy="median")),
                    ("scale", StandardScaler()),
                ]),
                num_cols,
            ),
            (
                "cat",
                Pipeline([
                    ("impute", SimpleImputer(strategy="most_frequent")),
                    ("onehot", OneHotEncoder(handle_unknown="ignore")),
                ]),
                cat_cols,
            ),
        ])

    # ------------------------------------------------------------------
    # Metrics
    # ------------------------------------------------------------------

    def _classification_metrics(
        self, y_true, y_pred, estimator, X_test: pd.DataFrame
    ) -> Dict[str, Any]:
        from sklearn.metrics import (
            accuracy_score,
            f1_score,
            precision_score,
            recall_score,
            roc_auc_score,
        )

        metrics: Dict[str, Any] = {
            "accuracy": round(float(accuracy_score(y_true, y_pred)), 4),
            "precision": round(float(precision_score(y_true, y_pred, average="weighted", zero_division=0)), 4),
            "recall": round(float(recall_score(y_true, y_pred, average="weighted", zero_division=0)), 4),
            "f1": round(float(f1_score(y_true, y_pred, average="weighted", zero_division=0)), 4),
            "roc_auc": None,
        }

        # ROC AUC requires probabilistic predictions; skip gracefully otherwise.
        try:
            proba = getattr(estimator, "predict_proba", None)
            if proba is None:
                return metrics
            y_proba = proba(X_test)
            n_classes = len(getattr(estimator, "classes_", []))
            if n_classes == 2 and y_proba.ndim == 2 and y_proba.shape[1] >= 2:
                auc = roc_auc_score(y_true, y_proba[:, 1])
            elif n_classes > 2 and y_proba.ndim == 2:
                auc = roc_auc_score(y_true, y_proba, multi_class="ovr")
            else:
                return metrics
            metrics["roc_auc"] = round(float(auc), 4)
        except Exception:
            metrics["roc_auc"] = None
        return metrics

    def _regression_metrics(self, y_true, y_pred) -> Dict[str, Any]:
        from sklearn.metrics import (
            mean_absolute_error,
            mean_absolute_percentage_error,
            mean_squared_error,
            r2_score,
        )

        mse = float(mean_squared_error(y_true, y_pred))
        mape = mean_absolute_percentage_error(y_true, y_pred)
        return {
            "r2": round(float(r2_score(y_true, y_pred)), 4),
            "rmse": round(float(np.sqrt(mse)), 4),
            "mae": round(float(mean_absolute_error(y_true, y_pred)), 4),
            "mape": round(float(mape), 4) if mape is not None and np.isfinite(mape) else None,
        }

    # ------------------------------------------------------------------
    # Public: availability
    # ------------------------------------------------------------------

    def available_models(self, task: str) -> List[Dict[str, Any]]:
        """List every model in the catalog for a task, with availability."""
        try:
            catalog = _catalog(task)
        except ValueError:
            raise
        ok, reason = _sklearn_available()
        result = []
        for entry in catalog:
            # The optional dependency is not installed.
            missing = self._dependency_reason(entry["requires"])
            if not ok:
                result.append({
                    "id": entry["id"],
                    "name": entry["name"],
                    "task": task,
                    "available": False,
                    "reason": reason,
                })
            elif missing:
                result.append({
                    "id": entry["id"],
                    "name": entry["name"],
                    "task": task,
                    "available": False,
                    "reason": f"Package '{missing}' not installed. Run `pip install {missing}`.",
                })
            else:
                result.append({
                    "id": entry["id"],
                    "name": entry["name"],
                    "task": task,
                    "available": True,
                    "reason": None,
                })
        return result

    def _dependency_reason(self, dep: str) -> Optional[str]:
        """Return the missing dependency name, or None if importable."""
        try:
            __import__(dep)
            return None
        except ImportError:
            return dep

    # ------------------------------------------------------------------
    # Public: run pipeline
    # ------------------------------------------------------------------

    def run_pipeline(
        self,
        dataset_id: str,
        target: Optional[str] = None,
        task: Optional[str] = None,
        models: Optional[List[str]] = None,
    ) -> Dict[str, Any]:
        """Train every compatible model and return metrics + best model."""
        ok, err = _sklearn_available()
        if not ok:
            return {"success": False, "error": err, "code": "SKLEARN_MISSING"}

        loaded = self._load_dataset(dataset_id)
        if not loaded:
            return {"success": False, "error": "Dataset not found", "code": "NOT_FOUND"}
        df = loaded["dataframe"]

        try:
            resolved_task, resolved_target = self._resolve_task_target(
                dataset_id, df, target, task
            )
        except ValueError as e:
            return {"success": False, "error": str(e), "code": "INVALID_CONFIG"}

        if resolved_task == "classification" and df[resolved_target].dtype != object:
            df = df.copy()
            df[resolved_target] = df[resolved_target].astype(str)

        num_cols, cat_cols = self._feature_columns(df, resolved_target)
        if not num_cols and not cat_cols:
            return {
                "success": False,
                "error": "No usable feature columns (numeric/categorical) remain after excluding the target.",
                "code": "NO_FEATURES",
            }

        from sklearn.model_selection import train_test_split

        X = df[num_cols + cat_cols]
        y = df[resolved_target]
        X_train, X_test, y_train, y_test = train_test_split(
            X,
            y,
            test_size=0.2,
            random_state=42,
            stratify=(y if resolved_task == "classification" else None),
        )

        preprocessor = self._make_preprocessor(num_cols, cat_cols)
        catalog = _catalog(resolved_task)
        requested = set(models) if models else None

        trained: List[Dict[str, Any]] = []
        skipped: List[Dict[str, Any]] = []
        track_mem = _psutil_available()

        for entry in catalog:
            if requested is not None and entry["id"] not in requested:
                continue

            missing = self._dependency_reason(entry["requires"])
            if missing:
                skipped.append({
                    "id": entry["id"],
                    "name": entry["name"],
                    "reason": f"Package '{missing}' not installed. Run `pip install {missing}`.",
                })
                continue

            try:
                estimator = entry["factory"]()
                result = self._train_one(
                    estimator,
                    entry,
                    preprocessor,
                    X_train,
                    X_test,
                    y_train,
                    y_test,
                    resolved_task,
                    track_mem,
                )
                if result is not None:
                    trained.append(result)
            except Exception as e:  # a single bad model must not abort the run
                logger.error(f"Training {entry['id']} failed: {e}")
                skipped.append({
                    "id": entry["id"],
                    "name": entry["name"],
                    "reason": f"Failed: {e}",
                })

        if not trained:
            return {
                "success": False,
                "error": "No models could be trained (see skipped).",
                "code": "NO_TRAINED",
                "skipped": _to_native(skipped),
            }

        primary_metric = "f1" if resolved_task == "classification" else "r2"
        best = min(trained, key=lambda m: (
            -m["metrics"].get(primary_metric, -1),
            m["training_time_s"],
        ))

        run_id = str(uuid.uuid4())
        self._persist(
            run_id=run_id,
            dataset_id=dataset_id,
            task=resolved_task,
            target=resolved_target,
            n_rows=len(df),
            n_features=len(num_cols) + len(cat_cols),
            best_model=best["id"],
            primary_metric=primary_metric,
            summary=trained,
            skipped=skipped,
            config={"target": target, "task": task, "models": models},
        )

        return {
            "success": True,
            "run_id": run_id,
            "dataset_id": dataset_id,
            "filename": loaded["filename"],
            "task": resolved_task,
            "target": resolved_target,
            "n_rows": len(df),
            "n_features": len(num_cols) + len(cat_cols),
            "primary_metric": primary_metric,
            "best_model": best["id"],
            "best_model_name": best["name"],
            "best_score": best["metrics"].get(primary_metric),
            "models": _to_native(trained),
            "skipped": _to_native(skipped),
        }

    def _train_one(
        self,
        estimator: Any,
        entry: Dict[str, Any],
        preprocessor: Any,
        X_train: pd.DataFrame,
        X_test: pd.DataFrame,
        y_train: pd.Series,
        y_test: pd.Series,
        task: str,
        track_mem: bool,
    ) -> Optional[Dict[str, Any]]:
        """Train a single estimator, measuring time + memory, and score it."""
        from sklearn.pipeline import Pipeline

        mem_before = None
        if track_mem:
            import psutil
            mem_before = psutil.Process().memory_info().rss

        pipe = Pipeline([("preprocess", preprocessor), ("model", estimator)])

        t0 = time.perf_counter()
        pipe.fit(X_train, y_train)
        train_time = time.perf_counter() - t0

        t0 = time.perf_counter()
        pred = pipe.predict(X_test)
        predict_time = time.perf_counter() - t0

        if track_mem:
            mem_after = psutil.Process().memory_info().rss
            mem_mb = round((mem_after - mem_before) / (1024 * 1024), 2)
            if mem_mb < 0:
                mem_mb = 0.0
        else:
            mem_mb = None

        if task == "classification":
            metrics = self._classification_metrics(y_test, pred, pipe, X_test)
        else:
            metrics = self._regression_metrics(y_test, pred)

        return {
            "id": entry["id"],
            "name": entry["name"],
            "status": "trained",
            "metrics": _to_native(metrics),
            "training_time_s": round(train_time, 3),
            "prediction_time_s": round(predict_time, 3),
            "memory_mb": mem_mb,
        }

    # ------------------------------------------------------------------
    # Persistence
    # ------------------------------------------------------------------

    def _persist(
        self,
        run_id: str,
        dataset_id: str,
        task: str,
        target: Optional[str],
        n_rows: int,
        n_features: int,
        best_model: str,
        primary_metric: str,
        summary: List[Dict[str, Any]],
        skipped: List[Dict[str, Any]],
        config: Dict[str, Any],
    ) -> None:
        db = get_sqlite().get_session()
        try:
            run = TrainingRun(
                id=run_id,
                dataset_id=dataset_id,
                task=task,
                target=target,
                n_rows=n_rows,
                n_features=n_features,
                best_model=best_model,
                primary_metric=primary_metric,
                summary=_to_native(summary),
                skipped=_to_native(skipped),
                config=config,
            )
            db.add(run)
            db.commit()
        except Exception as e:
            db.rollback()
            logger.error(f"Failed to persist training run {run_id}: {e}")
        finally:
            db.close()

    # ------------------------------------------------------------------
    # History
    # ------------------------------------------------------------------

    def get_runs(self, dataset_id: str) -> List[Dict[str, Any]]:
        """List stored training runs for a dataset (newest first)."""
        db = get_sqlite().get_session()
        try:
            rows = (
                db.query(TrainingRun)
                .filter(TrainingRun.dataset_id == dataset_id)
                .order_by(TrainingRun.created_at.desc())
                .all()
            )
            return [
                {
                    "run_id": r.id,
                    "dataset_id": r.dataset_id,
                    "task": r.task,
                    "target": r.target,
                    "best_model": r.best_model,
                    "primary_metric": r.primary_metric,
                    "n_rows": r.n_rows,
                    "n_features": r.n_features,
                    "created_at": r.created_at.isoformat() if r.created_at else None,
                }
                for r in rows
            ]
        finally:
            db.close()

    def get_run(self, dataset_id: str, run_id: str) -> Optional[Dict[str, Any]]:
        """Return a single stored run with full per-model details."""
        db = get_sqlite().get_session()
        try:
            run = (
                db.query(TrainingRun)
                .filter(TrainingRun.dataset_id == dataset_id, TrainingRun.id == run_id)
                .first()
            )
            if not run:
                return None
            return {
                "run_id": run.id,
                "dataset_id": run.dataset_id,
                "task": run.task,
                "target": run.target,
                "best_model": run.best_model,
                "primary_metric": run.primary_metric,
                "n_rows": run.n_rows,
                "n_features": run.n_features,
                "created_at": run.created_at.isoformat() if run.created_at else None,
                "models": run.summary or [],
                "skipped": run.skipped or [],
                "config": run.config or {},
            }
        finally:
            db.close()


training_service = TrainingService()
