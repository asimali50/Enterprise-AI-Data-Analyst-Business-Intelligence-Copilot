"""
Validator Unit Tests
"""
from app.utils.validators import (
    validate_file_extension,
    validate_file_size,
    validate_csv_headers,
    sanitize_filename,
    validate_column_name,
)


def test_valid_extensions():
    assert validate_file_extension("data.csv") is True
    assert validate_file_extension("data.xlsx") is True
    assert validate_file_extension("data.xls") is True
    assert validate_file_extension("data.exe") is False
    assert validate_file_extension("data.txt") is False


def test_file_size_validation():
    is_valid, msg = validate_file_size(1024)
    assert is_valid is True

    is_valid, msg = validate_file_size(200 * 1024 * 1024)  # 200MB
    assert is_valid is False
    assert "limit" in msg.lower()


def test_csv_headers():
    is_valid, msg = validate_csv_headers(["name", "age", "city"])
    assert is_valid is True

    is_valid, msg = validate_csv_headers([])
    assert is_valid is False

    is_valid, msg = validate_csv_headers(["a", "a"])
    assert is_valid is False

    is_valid, msg = validate_csv_headers(["name", "", "city"])
    assert is_valid is False


def test_sanitize_filename():
    assert sanitize_filename("my file.csv") == "my_file.csv"
    assert sanitize_filename("../../../etc/passwd") == "etc_passwd"
    assert sanitize_filename("test@file!.csv") == "test_file_.csv"


def test_column_name_validation():
    assert validate_column_name("revenue") is True
    assert validate_column_name("col_1") is True
    assert validate_column_name("") is False
    assert validate_column_name("a" * 300) is False
