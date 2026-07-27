"""
Test Configuration
Enterprise AI Data Analyst - Pytest Fixtures
"""
import os
import pytest
from fastapi.testclient import TestClient

# Set test environment before importing app
os.environ["DATABASE_URL"] = "sqlite:///:memory:"
os.environ["DUCKDB_PATH"] = ":memory:"
os.environ["ENVIRONMENT"] = "testing"
os.environ["DEBUG"] = "true"

from app.main import app
from app.database.sqlite_client import get_sqlite


@pytest.fixture(scope="session")
def client():
    """Create a test client"""
    with TestClient(app) as c:
        yield c


@pytest.fixture(scope="function")
def db_session():
    """Create a fresh database session per test"""
    sqlite = get_sqlite()
    session = sqlite.get_session()
    yield session
    session.close()
