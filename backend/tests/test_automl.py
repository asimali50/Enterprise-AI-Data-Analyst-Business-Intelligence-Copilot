"""
AutoML Route Tests
"""
import io

import numpy as np
import pandas as pd
from fastapi.testclient import TestClient


def _upload_csv(client: TestClient, filename="ml_houses.csv") -> str:
    rng = np.random.default_rng(42)
    n = 500
    df = pd.DataFrame(
        {
            "price": rng.normal(250, 50, n) + 3.0 * rng.normal(0, 5, n),
            "sqft": rng.normal(1800, 400, n),
            "rooms": rng.integers(1, 6, n),
            "age": rng.integers(0, 40, n),
            "neighborhood": rng.choice(["A", "B", "C", "D"], n),
            "sold": rng.integers(0, 2, n).astype(bool),
            "sale_date": pd.to_datetime("2023-01-01")
            + pd.to_timedelta(rng.integers(0, 700, n), unit="D"),
            "listing_id": [f"LST-{i:05d}" for i in range(n)],
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


def test_automl_inspect(client: TestClient):
    dataset_id = _upload_csv(client)
    resp = client.get(f"/api/v1/automl/inspect/{dataset_id}")
    assert resp.status_code == 200, resp.text
    data = resp.json()

    assert data["dataset_id"] == dataset_id
    assert data["shape"] == {"rows": 500, "columns": 8}
    assert len(data["columns"]) == 8

    tasks = {t["task"] for t in data["detected_tasks"]}
    # price = continuous -> regression; sold = binary -> classification;
    # sale_date -> time_series axis.
    assert "regression" in tasks
    assert "classification" in tasks
    assert "time_series" in tasks

    assert len(data["candidate_targets"]) >= 1
    assert 0 <= data["data_quality"]["health_score"] <= 100
    assert data["recommendation"]["task"] is not None


def test_automl_recommend_auto(client: TestClient):
    dataset_id = _upload_csv(client)
    resp = client.get(f"/api/v1/automl/models/{dataset_id}")
    assert resp.status_code == 200, resp.text
    data = resp.json()

    # Best labeled signal is the continuous price -> regression.
    assert data["task"] == "regression"
    assert data["recommended_model"]
    assert len(data["models"]) >= 1

    top = data["models"][0]
    assert top["rank"] == 1
    assert top["score"] >= 0
    assert top["why"] and top["rationale"]
    assert len(top["capability_breakdown"]) > 0
    assert "performance_estimate" in data


def test_automl_recommend_forced_classification(client: TestClient):
    dataset_id = _upload_csv(client)
    resp = client.get(
        f"/api/v1/automl/models/{dataset_id}",
        params={"target": "neighborhood", "task": "classification"},
    )
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert data["task"] == "classification"
    assert data["target"] == "neighborhood"
    assert data["recommended_model"]


def test_automl_recommend_clustering_no_target(client: TestClient):
    """Task override to clustering must not fall back to the auto-detected
    supervised target (regression). Regression test for a bug where forcing
    `task=clustering` still returned regression models."""
    dataset_id = _upload_csv(client)
    resp = client.get(
        f"/api/v1/automl/models/{dataset_id}", params={"task": "clustering"}
    )
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert data["task"] == "clustering"
    assert data["target"] is None
    assert data["recommended_model"] in ("kmeans", "dbscan", "hierarchical", "gaussian_mixture")
    assert data["models"][0]["id"] in ("kmeans", "dbscan", "hierarchical", "gaussian_mixture")


def test_automl_recommend_forced_time_series(client: TestClient):
    dataset_id = _upload_csv(client)
    resp = client.get(
        f"/api/v1/automl/models/{dataset_id}", params={"task": "time_series"}
    )
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert data["task"] == "time_series"
    assert data["time_column"] == "sale_date"
    assert data["target"] in ("price", "sqft", "rooms", "age")
    assert data["models"][0]["id"] in (
        "exponential_smoothing",
        "sarima",
        "prophet",
        "ml_forecast",
    )


def test_automl_recommend_target_only_detects_task(client: TestClient):
    dataset_id = _upload_csv(client)
    resp = client.get(f"/api/v1/automl/models/{dataset_id}", params={"target": "sold"})
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert data["task"] == "classification"
    assert data["target"] == "sold"


def test_automl_recommend_post_variant(client: TestClient):
    dataset_id = _upload_csv(client)
    resp = client.post(
        "/api/v1/automl/recommend",
        json={"dataset_id": dataset_id, "target": "price", "task": "regression"},
    )
    assert resp.status_code == 200, resp.text
    assert resp.json()["task"] == "regression"


def test_automl_unknown_task_422(client: TestClient):
    dataset_id = _upload_csv(client)
    resp = client.get(f"/api/v1/automl/models/{dataset_id}", params={"task": "nonsense"})
    assert resp.status_code == 422


def test_automl_missing_dataset_404(client: TestClient):
    assert client.get("/api/v1/automl/inspect/does-not-exist").status_code == 404
    assert client.get("/api/v1/automl/models/does-not-exist").status_code == 404


def test_automl_train_degrades_gracefully_without_sklearn(client: TestClient):
    """Quick train must not 500 when scikit-learn is absent — it returns a
    structured SKLEARN_MISSING response the UI can surface."""
    dataset_id = _upload_csv(client)
    resp = client.post(
        "/api/v1/automl/train",
        json={
            "dataset_id": dataset_id,
            "target": "price",
            "task": "regression",
            "model_id": "random_forest_regressor",
        },
    )
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert data["success"] is False
    assert data["code"] == "SKLEARN_MISSING"
