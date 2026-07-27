"""
Upload Routes
Enterprise AI Data Analyst - File Upload API
"""
from fastapi import APIRouter, UploadFile, File, HTTPException, status
from typing import Optional
import time
from app.utils.file_handler import file_handler
from app.services.data_processor import data_processor_service
from app.schemas import DatasetPreview, ErrorResponse
from app.utils.logger import logger

router = APIRouter(prefix="/upload", tags=["upload"])


@router.post("/file")
async def upload_file(file: UploadFile = File(...)) -> dict:
    """
    Upload a CSV or Excel file for analysis.

    - **file**: The data file (CSV, XLSX, XLS)

    Returns dataset_id for reference in subsequent operations.
    """
    try:
        # Read file content
        content = await file.read()
        if not content:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="File is empty"
            )

        # Save file
        file_id = file_handler.save_upload(
            file_path=None,
            file_content=content,
            original_filename=file.filename
        )

        if not file_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to save file. Check file format and size."
            )

        # Process and register
        dataset_id = data_processor_service.process_upload(file_id, file.filename)

        if not dataset_id:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to process dataset"
            )

        logger.info(f"File uploaded successfully: {file.filename} -> {dataset_id}")

        return {
            "success": True,
            "dataset_id": dataset_id,
            "filename": file.filename,
            "file_id": file_id,
            "message": "File uploaded successfully"
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Upload error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.get("/preview/{dataset_id}")
async def get_preview(dataset_id: str) -> DatasetPreview:
    """
    Get dataset preview with schema and first rows.

    - **dataset_id**: The dataset identifier
    """
    try:
        preview = data_processor_service.get_dataset_preview(dataset_id)

        if not preview:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Dataset not found"
            )

        return preview

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Preview error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.delete("/{dataset_id}")
async def delete_dataset(dataset_id: str) -> dict:
    """
    Delete a dataset and associated files.

    - **dataset_id**: The dataset identifier
    """
    try:
        from app.database.sqlite_client import get_sqlite
        from app.database.models import Dataset

        db = get_sqlite().get_session()
        try:
            dataset = db.query(Dataset).filter(Dataset.id == dataset_id).first()

            if not dataset:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Dataset not found"
                )

            # Delete file
            file_handler.delete_file(dataset.file_id)

            # Delete from database
            db.delete(dataset)
            db.commit()

            logger.info(f"Dataset deleted: {dataset_id}")

            return {
                "success": True,
                "message": "Dataset deleted successfully"
            }

        finally:
            db.close()

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Delete error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )
