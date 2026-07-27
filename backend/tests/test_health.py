"""
Health Route Tests
"""
from fastapi.testclient import TestClient


def test_health_check(client: TestClient):
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "version" in data


def test_root_endpoint(client: TestClient):
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert "app" in data
    assert "version" in data


def test_config_endpoint(client: TestClient):
    response = client.get("/config")
    assert response.status_code == 200
    data = response.json()
    assert "app_name" in data
    assert "max_upload_size_mb" in data


def test_models_endpoint(client: TestClient):
    response = client.get("/models")
    assert response.status_code == 200
    data = response.json()
    assert "providers" in data
    assert "default_provider" in data
