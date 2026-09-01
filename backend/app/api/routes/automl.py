"""
AutoML Routes
Enterprise AI Data Analyst - Automated Machine Learning Studio API

New self-contained module exposing the AutoML workflow:
  1. Inspect a dataset (schema, roles, quality, detected tasks, candidate targets).
  2. Recommend the best models for a chosen (or auto-detected) target/task,
     with a data-driven rationale explaining *why* each model fits.
  3. Optionally train a quick model and report validation metrics (requires
     scikit-learn; absent gracefully otherwise).

Prefix: /automl
"""
from typing import Optional

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel

from app.services.automl_service import automl_service
from app.utils.logger import logger

router = APIRouter(prefix="/automl", tags=["automl"])


# ---------------------------------------------------------------------------
# Request models
# ---------------------------------------------------------------------------

class ModelRecommendRequest(BaseModel):
    """Parameters for model recommendation."""
    dataset_id: str
    target: Optional[str] = None    # optional user-chosen target column
    task: Optional[str] = None      # regression | classification | clustering | time_series


class TrainRequest(BaseModel):
    """Parameters for quick model training/validation."""
    dataset_id: str
    target: str
    task: str                       # regression | classification
    model_id: Optional[str] = None


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.get("/inspect/{dataset_id}")
async def inspect_dataset(dataset_id: str) -> dict:
    """
    Automatically inspect a dataset.

    Returns the full schema, column roles, data-quality signals, detected ML
    tasks (regression / classification / time series / clustering) with
    confidence, and a ranked list of candidate target columns.

    - **dataset_id**: The dataset to inspect.
    """
    try:
        result = automl_service.inspect_dataset(dataset_id)
        if result is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Dataset not found",
            )
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"AutoML inspect error for {dataset_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e),
        )


@router.get("/models/{dataset_id}")
async def recommend_models(
    dataset_id: str,
    target: Optional[str] = None,
    task: Optional[str] = None,
) -> dict:
    """
    Recommend the best ML models for a dataset.

    Honors an optional user-chosen target column and/or task override; when
    omitted, the auto-detected best target/task is used. Every model returns a
    score (0-100), a data-driven rationale, and a capability breakdown.

    - **dataset_id**: The dataset.
    - **target**: Optional target column (query param).
    - **task**: Optional task override (query param).
    """
    try:
        result = automl_service.recommend_models(dataset_id, target=target, task=task)
        if result is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Dataset not found",
            )
        return result
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(e))
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"AutoML recommend error for {dataset_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e),
        )


@router.post("/recommend")
async def recommend_models_post(request: ModelRecommendRequest) -> dict:
    """
    POST variant of model recommendation (uses a JSON body instead of query
    params), convenient for large or logged requests.

    - **dataset_id**: The dataset.
    - **target**: Optional user target column.
    - **task**: Optional task override.
    """
    try:
        result = automl_service.recommend_models(
            request.dataset_id, target=request.target, task=request.task
        )
        if result is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Dataset not found",
            )
        return result
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(e))
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"AutoML recommend (POST) error for {request.dataset_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e),
        )


@router.post("/train")
async def train_model(request: TrainRequest) -> dict:
    """
    Train a quick model on the dataset and return validation metrics.

    Requires scikit-learn in the backend environment. When it is missing, a
    structured error (code SKLEARN_MISSING) is returned so the UI can surface
    the exact install step without breaking the rest of the workflow.

    - **dataset_id**: The dataset.
    - **target**: The target column.
    - **task**: regression or classification.
    - **model_id**: Optional model to train (defaults to a robust ensemble).
    """
    try:
        return automl_service.train_model(
            request.dataset_id,
            target=request.target,
            task=request.task,
            model_id=request.model_id,
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"AutoML train error for {request.dataset_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e),
        )