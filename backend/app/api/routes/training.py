"""
Training Pipeline Routes
Enterprise AI Data Analyst - Multi-Model Automated Training API

Exposes the multi-model training pipeline:
  1. List available (compatible) models for a task, with availability.
  2. Run the full pipeline: train every compatible model, report metrics,
     runtime + memory, and persist the run.
  3. Read back stored runs (history list / single run).

Prefix: /training
"""
from typing import List, Optional

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel

from app.services.training_service import training_service
from app.utils.logger import logger

router = APIRouter(prefix="/training", tags=["training"])


# ---------------------------------------------------------------------------
# Request models
# ---------------------------------------------------------------------------

class TrainingRunRequest(BaseModel):
    """Parameters for running the multi-model training pipeline."""
    dataset_id: str
    target: Optional[str] = None    # optional user-chosen target column
    task: Optional[str] = None      # regression | classification
    models: Optional[List[str]] = None  # optional subset of model ids


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.get("/models")
async def list_models(task: Optional[str] = None) -> dict:
    """
    List every model in the catalog for a task with availability.

    - **task**: regression or classification. When omitted, both are returned.
    """
    try:
        if task:
            return {"task": task, "models": training_service.available_models(task)}
        return {
            "classification": training_service.available_models("classification"),
            "regression": training_service.available_models("regression"),
        }
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(e),
        )
    except Exception as e:
        logger.error(f"Training models list error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e),
        )


@router.post("/run")
async def run_training(request: TrainingRunRequest) -> dict:
    """
    Run the full multi-model training pipeline on a dataset.

    Trains every compatible model, returns standard metrics (accuracy /
    precision / recall / F1 / ROC AUC for classification; R2 / RMSE / MAE /
    MAPE for regression) plus training time, prediction time and memory usage,
    and identifies the best model. Results are persisted for history.

    - **dataset_id**: The dataset to train on.
    - **target**: Optional target column (auto-detected when omitted).
    - **task**: regression or classification (auto-detected when omitted).
    - **models**: Optional list of model ids to restrict the run to.
    """
    try:
        return training_service.run_pipeline(
            request.dataset_id,
            target=request.target,
            task=request.task,
            models=request.models,
        )
    except Exception as e:
        logger.error(f"Training run error for {request.dataset_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e),
        )


@router.get("/runs/{dataset_id}")
async def list_runs(dataset_id: str) -> dict:
    """
    List stored training runs for a dataset (newest first).

    - **dataset_id**: The dataset to list runs for.
    """
    try:
        return {"dataset_id": dataset_id, "runs": training_service.get_runs(dataset_id)}
    except Exception as e:
        logger.error(f"Training runs list error for {dataset_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e),
        )


@router.get("/runs/{dataset_id}/{run_id}")
async def get_run(dataset_id: str, run_id: str) -> dict:
    """
    Return a single stored training run with full per-model details.

    - **dataset_id**: The dataset the run belongs to.
    - **run_id**: The stored run id.
    """
    try:
        run = training_service.get_run(dataset_id, run_id)
        if run is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Training run not found",
            )
        return run
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Training run detail error for {run_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e),
        )
