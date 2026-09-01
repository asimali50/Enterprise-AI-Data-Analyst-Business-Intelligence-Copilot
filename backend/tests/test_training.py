"""
Training Pipeline Route Tests

The full-pipeline tests require scikit-learn; they are skipped when it is
absent so the suite still passes on environments without ML packages. The
catalog-listing and graceful-degradation tests run everywhere.
"""
import io

import pytest
from fastapi.testclient import TestClient

try:
    import sklearn  # noqa: F401
    HAS_SKLEARN = True
except ImportError:
    HAS_SKLEARN = False

requires_sklearn = pytest.mark.skipif(not HAS_SKLEARN, reason="scikit-learn not installed")

EXPECTED_CLASSIFIERS = [
    "logistic_regression",
    "naive_bayes",
    "knn",
    "svm",
    "decision_tree",
    "random_forest",
    "xgboost",
    "lightgbm",
    "catboost",
]

EXPECTED_REGRESSORS = [
    "linear_regression",
    "knn",
    "svm",
    "decision_tree",
    "random_forest",
    "xgboost",
    "lightgbm",
    "catboost",
]


def _upload_csv(client: TestClient, n=200, filename="train_houses.csv") -> str:
    import numpy as np
    import pandas as pd

    rng = np.random.default_rng(7)
    df = pd.DataFrame(
        {
            "price": rng.normal(250, 50, n) + 3.0 * rng.normal(0, 5, n),
            "sqft": rng.normal(1800, 400, n),
            "rooms": rng.integers(1, 6, n),
            "age": rng.integers(0, 40, n),
            "neighborhood": rng.choice(["A", "B", "C", "D"], n),
            "sold": rng.integers(0, 2, n).astype(bool),
        }
    )
    buf = io.StringIO()
    df.to_csv(buf, index=False)
    resp = client.post(
        "/api/v1/upload/file",
        files={"file": (filename, buf.getvalue().encode(), "text/csv")},
    )
    assert resp.status_code == 200, resp.text
    return resp.json()["dataset_id"]


def test_training_models_lists_full_catalog(client: TestClient):
    resp = client.get("/api/v1/training/models")
    assert resp.status_code == 200, resp.text
    data = resp.json()

    assert [m["id"] for m in data["classification"]] == EXPECTED_CLASSIFIERS
    assert [m["id"] for m in data["regression"]] == EXPECTED_REGRESSORS

    # Every entry has the availability contract the UI relies on.
    for model in data["classification"] + data["regression"]:
        assert "available" in model
        assert "reason" in model
        assert model["task"] in ("classification", "regression")


def test_training_models_by_task(client: TestClient):
    resp = client.get("/api/v1/training/models", params={"task": "classification"})
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert data["task"] == "classification"
    assert [m["id"] for m in data["models"]] == EXPECTED_CLASSIFIERS


def test_training_run_graceful_without_sklearn(client: TestClient):
    """Must not 500 when scikit-learn is absent — returns SKLEARN_MISSING."""
    dataset_id = _upload_csv(client)
    resp = client.post(
        "/api/v1/training/run",
        json={"dataset_id": dataset_id, "target": "price", "task": "regression"},
    )
    assert resp.status_code == 200, resp.text
    data = resp.json()
    if not HAS_SKLEARN:
        assert data["success"] is False
        assert data["code"] == "SKLEARN_MISSING"
    else:
        assert data["success"] is True
        assert data["run_id"]


@requires_sklearn
def test_training_run_classification(client: TestClient):
    dataset_id = _upload_csv(client)
    resp = client.post(
        "/api/v1/training/run",
        json={"dataset_id": dataset_id, "target": "sold", "task": "classification"},
    )
    assert resp.status_code == 200, resp.text
    data = resp.json()

    assert data["success"] is True
    assert data["task"] == "classification"
    assert data["target"] == "sold"
    assert data["run_id"]
    assert len(data["models"]) >= 1

    # Metric contract: accuracy / precision / recall / f1 / roc_auc.
    trained_ids = {m["id"] for m in data["models"]}
    expected = EXPECTED_CLASSIFIERS
    # xgboost/lightgbm/catboost may be absent -> gracefully skipped.
    assert trained_ids.issubset(set(expected))
    assert "skipped" in data

    for m in data["models"]:
        assert m["status"] == "trained"
        assert set(("accuracy", "precision", "recall", "f1")).issubset(m["metrics"])
        assert 0 <= m["metrics"]["accuracy"] <= 1
        assert m["training_time_s"] >= 0
        assert m["prediction_time_s"] >= 0
        # roc_auc is set when probabilistic predictions are available.
        if m["metrics"]["roc_auc"] is not None:
            assert 0 <= m["metrics"]["roc_auc"] <= 1

    # Best model = highest F1 among trained.
    assert data["primary_metric"] == "f1"
    assert data["best_model"]
    assert data["best_model"] in trained_ids
    assert data["best_model_name"]


@requires_sklearn
def test_training_run_regression(client: TestClient):
    dataset_id = _upload_csv(client)
    resp = client.post(
        "/api/v1/training/run",
        json={"dataset_id": dataset_id, "target": "price", "task": "regression"},
    )
    assert resp.status_code == 200, resp.text
    data = resp.json()

    assert data["success"] is True
    assert data["task"] == "regression"
    assert data["target"] == "price"

    trained_ids = {m["id"] for m in data["models"]}
    assert trained_ids.issubset(set(EXPECTED_REGRESSORS))

    for m in data["models"]:
        assert set(("r2", "rmse", "mae", "mape")).issubset(m["metrics"])
        assert m["training_time_s"] >= 0
        assert m["prediction_time_s"] >= 0

    assert data["primary_metric"] == "r2"
    assert data["best_model"] in trained_ids


@requires_sklearn
def test_training_run_auto_detect_target_task(client: TestClient):
    """With no target/task, the pipeline auto-detects from the dataset."""
    dataset_id = _upload_csv(client)
    resp = client.post("/api/v1/training/run", json={"dataset_id": dataset_id})
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert data["success"] is True
    # price is continuous -> regression is the strongest signal.
    assert data["task"] == "regression"
    assert data["target"] == "price"


@requires_sklearn
def test_training_run_model_subset(client: TestClient):
    dataset_id = _upload_csv(client)
    resp = client.post(
        "/api/v1/training/run",
        json={
            "dataset_id": dataset_id,
            "target": "price",
            "task": "regression",
            "models": ["linear_regression", "random_forest"],
        },
    )
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert data["success"] is True
    trained_ids = {m["id"] for m in data["models"]}
    assert trained_ids.issubset({"linear_regression", "random_forest"})


@requires_sklearn
def test_training_run_persists_and_history_readback(client: TestClient):
    dataset_id = _upload_csv(client)
    resp = client.post(
        "/api/v1/training/run",
        json={"dataset_id": dataset_id, "target": "sold", "task": "classification"},
    )
    assert resp.status_code == 200, resp.text
    run = resp.json()
    assert run["success"] is True
    run_id = run["run_id"]

    # History lists the run.
    list_resp = client.get(f"/api/v1/training/runs/{dataset_id}")
    assert list_resp.status_code == 200, list_resp.text
    history = list_resp.json()["runs"]
    assert any(r["run_id"] == run_id for r in history)
    row = next(r for r in history if r["run_id"] == run_id)
    assert row["best_model"] == run["best_model"]
    assert row["primary_metric"] == "f1"

    # Full detail round-trips the per-model metrics.
    detail = client.get(f"/api/v1/training/runs/{dataset_id}/{run_id}")
    assert detail.status_code == 200, detail.text
    full = detail.json()
    assert full["run_id"] == run_id
    assert full["task"] == "classification"
    assert len(full["models"]) == len(run["models"])
    assert "skipped" in full and "config" in full


def test_training_history_empty_for_unknown_dataset(client: TestClient):
    resp = client.get("/api/v1/training/runs/does-not-exist")
    assert resp.status_code == 200, resp.text
    assert resp.json()["runs"] == []


def test_training_run_detail_404(client: TestClient):
    resp = client.get("/api/v1/training/runs/does-not-exist/nope")
    assert resp.status_code == 404, resp.status_code
