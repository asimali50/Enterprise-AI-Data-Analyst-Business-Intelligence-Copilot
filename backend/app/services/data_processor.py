"""
Data Processing Service
Enterprise AI Data Analyst - Data Processing Layer
"""
import json
import uuid
from datetime import datetime
from typing import Optional, Dict, Any, List
import numpy as np
import pandas as pd
from app.utils.file_handler import file_handler
from app.database.duckdb_client import get_duckdb
from app.database.sqlite_client import get_sqlite
from app.database.models import Dataset, AnalysisResult
from app.utils.logger import logger
from app.schemas import DatasetPreview, ColumnInfo


class DataProcessorService:
    """Service for processing uploaded datasets"""

    def __init__(self):
        self.duckdb = get_duckdb()
        self.sqlite = get_sqlite()
        self.file_handler = file_handler

    def process_upload(self, file_id: str, original_filename: str) -> Optional[str]:
        """Process uploaded file and register in databases"""
        try:
            # Read CSV
            df = self.file_handler.read_csv(file_id)
            if df is None:
                logger.error(f"Failed to read CSV: {file_id}")
                return None

            # Validate
            if df.empty:
                logger.warning(f"Empty dataset: {file_id}")
                return None

            # Clean column names
            df.columns = df.columns.str.strip()

            # Create dataset ID
            dataset_id = str(uuid.uuid4())

            # Register in DuckDB
            table_name = f"dataset_{dataset_id.replace('-', '_')}"
            if not self.duckdb.register_dataframe(df, table_name):
                logger.error(f"Failed to register in DuckDB: {dataset_id}")
                return None

            # Extract column info
            columns_info = self._extract_column_info(df)
            preview_data_raw = df.head(5).to_dict(orient="records")
            # Convert numpy types to native Python for JSON serialization
            preview_data = self._convert_to_native(preview_data_raw)

            # Store metadata in SQLite
            db = self.sqlite.get_session()
            try:
                dataset = Dataset(
                    id=dataset_id,
                    filename=original_filename,
                    file_id=file_id,
                    num_rows=len(df),
                    num_columns=len(df.columns),
                    file_size_bytes=int(df.memory_usage(deep=True).sum()),
                    columns_info=columns_info,
                    preview_data=preview_data,
                    analysis_status="pending"
                )
                db.add(dataset)
                db.commit()
                logger.info(f"Dataset registered: {dataset_id}")
                return dataset_id
            finally:
                db.close()

        except Exception as e:
            logger.error(f"Error processing upload: {e}")
            return None

    def get_dataset_preview(self, dataset_id: str) -> Optional[DatasetPreview]:
        """Get dataset preview"""
        try:
            db = self.sqlite.get_session()
            try:
                dataset = db.query(Dataset).filter(Dataset.id == dataset_id).first()
                if not dataset:
                    return None

                columns = [
                    ColumnInfo(
                        name=col["name"],
                        dtype=col["dtype"],
                        non_null_count=col.get("non_null_count", 0),
                        null_count=col.get("null_count", 0),
                        null_percentage=col.get("null_percentage", 0)
                    )
                    for col in dataset.columns_info
                ]

                return DatasetPreview(
                    dataset_id=dataset.id,
                    filename=dataset.filename,
                    num_rows=dataset.num_rows,
                    num_columns=dataset.num_columns,
                    columns=columns,
                    preview_data=dataset.preview_data,
                    file_size_mb=dataset.file_size_bytes / (1024 * 1024),
                    upload_date=dataset.upload_date
                )
            finally:
                db.close()
        except Exception as e:
            logger.error(f"Error getting dataset preview: {e}")
            return None

    def _extract_column_info(self, df: pd.DataFrame) -> List[Dict[str, Any]]:
        """Extract column information from DataFrame"""
        columns_info = []
        for col in df.columns:
            null_count = int(df[col].isna().sum())
            columns_info.append({
                "name": str(col),
                "dtype": str(df[col].dtype),
                "non_null_count": int(len(df) - null_count),
                "null_count": null_count,
                "null_percentage": float((null_count / len(df)) * 100)
            })
        return columns_info

    def _convert_to_native(self, obj: Any) -> Any:
        """Recursively convert numpy types to native Python types for JSON serialization"""
        if isinstance(obj, dict):
            return {k: self._convert_to_native(v) for k, v in obj.items()}
        elif isinstance(obj, list):
            return [self._convert_to_native(v) for v in obj]
        elif isinstance(obj, np.integer):
            return int(obj)
        elif isinstance(obj, np.floating):
            return float(obj)
        elif isinstance(obj, np.bool_):
            return bool(obj)
        elif isinstance(obj, np.ndarray):
            return self._convert_to_native(obj.tolist())
        return obj


data_processor_service = DataProcessorService()
