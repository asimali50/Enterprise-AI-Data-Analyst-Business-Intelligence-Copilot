"""
Upload Route Tests
"""
import io
from fastapi.testclient import TestClient


def test_upload_csv(client: TestClient):
    csv_content = b"id,name,value\n1,Alice,100\n2,Bob,200\n3,Carol,300\n"
    response = client.post(
        "/api/v1/upload/file",
        files={"file": ("test.csv", io.BytesIO(csv_content), "text/csv")},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "dataset_id" in data
    assert data["filename"] == "test.csv"


def test_upload_empty_file(client: TestClient):
    response = client.post(
        "/api/v1/upload/file",
        files={"file": ("empty.csv", io.BytesIO(b""), "text/csv")},
    )
    assert response.status_code == 400


def test_upload_invalid_extension(client: TestClient):
    response = client.post(
        "/api/v1/upload/file",
        files={"file": ("test.exe", io.BytesIO(b"malware"), "application/octet-stream")},
    )
    assert response.status_code == 400


def test_preview_nonexistent(client: TestClient):
    response = client.get("/api/v1/upload/preview/nonexistent-id")
    assert response.status_code == 404


def test_delete_nonexistent(client: TestClient):
    response = client.delete("/api/v1/upload/nonexistent-id")
    assert response.status_code == 404
