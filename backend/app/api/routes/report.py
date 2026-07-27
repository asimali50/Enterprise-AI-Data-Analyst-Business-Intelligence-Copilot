"""
Report Routes
Enterprise AI Data Analyst - Report API
"""
from fastapi import APIRouter, HTTPException, status
from typing import Optional
from app.services.report_generator import report_generator_service
from app.utils.logger import logger

router = APIRouter(prefix="/reports", tags=["reports"])


@router.post("/generate/{dataset_id}")
async def generate_report(dataset_id: str) -> dict:
    """
    Generate a comprehensive Markdown report for a dataset.

    Combines all available analysis results into an executive-ready report.

    - **dataset_id**: The dataset to generate a report for
    """
    try:
        result = report_generator_service.generate_markdown_report(dataset_id)

        if not result:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Could not generate report. Dataset not found or no analysis results available."
            )

        return {
            "success": True,
            **result,
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Report generation error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.get("/list/{dataset_id}")
async def list_reports(dataset_id: str) -> dict:
    """List all saved reports for a dataset"""
    try:
        reports = report_generator_service.get_saved_reports(dataset_id)
        return {
            "dataset_id": dataset_id,
            "reports": reports,
            "count": len(reports),
        }
    except Exception as e:
        logger.error(f"Error listing reports: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.get("/{report_id}")
async def get_report(report_id: str) -> dict:
    """Get full report content by report ID"""
    try:
        report = report_generator_service.get_report_content(report_id)

        if not report:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Report not found"
            )

        return report

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching report: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )
