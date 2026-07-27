"""
Schema Validation Tests
"""
import pytest
from pydantic import ValidationError
from app.schemas import (
    ColumnInfo,
    DatasetPreview,
    AnalyzeRequest,
    ChatRequest,
    AIProviderConfig,
)


def test_column_info_valid():
    col = ColumnInfo(
        name="revenue",
        dtype="float64",
        non_null_count=100,
        null_count=0,
        null_percentage=0.0,
    )
    assert col.name == "revenue"


def test_column_info_invalid():
    with pytest.raises(ValidationError):
        ColumnInfo(
            name="",
            dtype="float64",
            non_null_count=100,
            null_count=0,
            null_percentage=0.0,
        )


def test_analyze_request_defaults():
    req = AnalyzeRequest(dataset_id="test-123")
    assert req.dataset_id == "test-123"
    assert "profiling" in req.analysis_types
    assert "analytics" in req.analysis_types
    assert "visualization" in req.analysis_types
    assert "insights" in req.analysis_types


def test_chat_request():
    req = ChatRequest(dataset_id="test-123", message="What is the average revenue?")
    assert req.dataset_id == "test-123"
    assert req.conversation_history is None


def test_ai_provider_config_temperature_bounds():
    with pytest.raises(ValidationError):
        AIProviderConfig(
            provider="openai",
            model="gpt-4",
            temperature=5.0,  # Out of range (0-2)
            max_tokens=4000,
        )


def test_ai_provider_config_valid():
    config = AIProviderConfig(
        provider="openai",
        model="gpt-4-turbo",
        temperature=0.7,
        max_tokens=4000,
    )
    assert config.temperature == 0.7
