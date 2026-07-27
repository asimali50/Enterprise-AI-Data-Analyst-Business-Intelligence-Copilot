"""
File Handler Utilities
Enterprise AI Data Analyst - File Management
"""
import os
import shutil
from pathlib import Path
from typing import Optional
import pandas as pd
from app.config import get_settings
from app.utils.validators import validate_file_extension, validate_file_size, sanitize_filename
from app.utils.logger import logger


class FileHandler:
    """Handle file operations for data uploads"""

    def __init__(self):
        self.settings = get_settings()
        self.upload_dir = Path(self.settings.UPLOAD_DIR)
        self.upload_dir.mkdir(exist_ok=True)

    def save_upload(self, file_path: str, file_content: bytes, original_filename: str) -> Optional[str]:
        """Save uploaded file to disk"""
        try:
            # Validate
            if not validate_file_extension(original_filename):
                logger.warning(f"Invalid file extension: {original_filename}")
                return None

            is_valid, msg = validate_file_size(len(file_content))
            if not is_valid:
                logger.warning(f"File size validation failed: {msg}")
                return None

            # Sanitize and save
            safe_name = sanitize_filename(original_filename)
            file_id = self._generate_file_id(safe_name)
            save_path = self.upload_dir / file_id

            with open(save_path, "wb") as f:
                f.write(file_content)

            logger.info(f"File saved: {file_id}")
            return file_id

        except Exception as e:
            logger.error(f"Error saving upload: {e}")
            return None

    def delete_file(self, file_id: str) -> bool:
        """Delete uploaded file"""
        try:
            file_path = self.upload_dir / file_id
            if file_path.exists():
                file_path.unlink()
                logger.info(f"File deleted: {file_id}")
                return True
            return False
        except Exception as e:
            logger.error(f"Error deleting file: {e}")
            return False

    def get_file_path(self, file_id: str) -> Optional[Path]:
        """Get full path to file"""
        file_path = self.upload_dir / file_id
        if file_path.exists():
            return file_path
        return None

    def read_csv(self, file_id: str) -> Optional[pd.DataFrame]:
        """Read CSV file into DataFrame"""
        try:
            file_path = self.get_file_path(file_id)
            if not file_path:
                return None

            df = pd.read_csv(file_path)
            logger.info(f"CSV loaded: {file_id}, shape: {df.shape}")
            return df

        except Exception as e:
            logger.error(f"Error reading CSV: {e}")
            return None

    def _generate_file_id(self, original_filename: str) -> str:
        """Generate unique file ID"""
        import uuid
        import time
        ext = Path(original_filename).suffix
        timestamp = int(time.time())
        unique_id = str(uuid.uuid4())[:8]
        return f"{timestamp}_{unique_id}{ext}"


file_handler = FileHandler()
