"""
Input Validators
Enterprise AI Data Analyst - Data Validation
"""
import os
from pathlib import Path
from typing import List, Tuple
from app.config import get_settings


def validate_file_extension(filename: str) -> bool:
    """Validate file has allowed extension"""
    settings = get_settings()
    ext = Path(filename).suffix.lstrip(".").lower()
    return ext in settings.ALLOWED_EXTENSIONS


def validate_file_size(file_size: int) -> Tuple[bool, str]:
    """Validate file size is within limits"""
    settings = get_settings()
    if file_size > settings.MAX_UPLOAD_SIZE_BYTES:
        return False, f"File size exceeds {settings.MAX_UPLOAD_SIZE_MB}MB limit"
    return True, "OK"


def validate_csv_headers(headers: List[str]) -> Tuple[bool, str]:
    """Validate CSV headers are not empty and valid"""
    if not headers:
        return False, "CSV has no headers"

    if len(headers) != len(set(headers)):
        return False, "CSV has duplicate column names"

    # Check for empty column names
    if any(not h.strip() for h in headers):
        return False, "CSV has empty column names"

    return True, "OK"


def sanitize_filename(filename: str) -> str:
    """Remove potentially dangerous characters from filename"""
    # Keep only alphanumeric, dash, underscore, and dot
    import re
    sanitized = re.sub(r'[^\w\-\.]', '_', filename)
    # Remove leading/trailing dots and dashes
    sanitized = sanitized.strip('.-')
    return sanitized


def validate_column_name(name: str) -> bool:
    """Check if column name is valid"""
    if not name or not isinstance(name, str):
        return False
    if len(name) > 255:
        return False
    # Allow alphanumeric, underscore, dash, and space
    import re
    return bool(re.match(r'^[a-zA-Z0-9_\-\s]+$', name))
