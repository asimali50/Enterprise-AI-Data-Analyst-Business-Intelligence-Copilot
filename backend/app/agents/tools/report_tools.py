"""
Report Generation Tools
Enterprise AI Data Analyst - Agent Tools for Report Creation
"""
import json
from typing import Optional, Dict, Any
from datetime import datetime
from app.database.duckdb_client import get_duckdb
from app.database.sqlite_client import get_sqlite
from app.database.models import Dataset, AnalysisResult, Report
from app.utils.logger import logger


class ReportTools:
    """Tools available to the Report Generator Agent"""

    def __init__(self):
        self.duckdb = get_duckdb()
        self.sqlite = get_sqlite()

    def get_dataset_metadata(self, dataset_id: str) -> str:
        """Retrieve stored dataset metadata"""
        try:
            db = self.sqlite.get_session()
            try:
                dataset = db.query(Dataset).filter(Dataset.id == dataset_id).first()
                if not dataset:
                    return json.dumps({"error": "Dataset not found"})

                return json.dumps({
                    "id": dataset.id,
                    "filename": dataset.filename,
                    "num_rows": dataset.num_rows,
                    "num_columns": dataset.num_columns,
                    "file_size_bytes": dataset.file_size_bytes,
                    "upload_date": str(dataset.upload_date),
                    "health_score": dataset.health_score,
                    "analysis_status": dataset.analysis_status,
                }, indent=2)
            finally:
                db.close()
        except Exception as e:
            return json.dumps({"error": str(e)})

    def get_analysis_results(self, dataset_id: str) -> str:
        """Retrieve stored analysis results for a dataset"""
        try:
            db = self.sqlite.get_session()
            try:
                results = db.query(AnalysisResult).filter(
                    AnalysisResult.dataset_id == dataset_id
                ).all()

                if not results:
                    return json.dumps({"message": "No analysis results found"})

                output = []
                for r in results:
                    output.append({
                        "analysis_type": r.analysis_type,
                        "result_data": r.result_data,
                        "processing_time": r.processing_time_seconds,
                        "created_at": str(r.created_at),
                    })

                return json.dumps({"results": output}, indent=2)
            finally:
                db.close()
        except Exception as e:
            return json.dumps({"error": str(e)})

    def save_report(self, dataset_id: str, title: str, content: str, report_type: str = "markdown") -> str:
        """Save a generated report to the database"""
        try:
            import uuid
            report_id = str(uuid.uuid4())
            db = self.sqlite.get_session()
            try:
                report = Report(
                    id=report_id,
                    dataset_id=dataset_id,
                    report_type=report_type,
                    title=title,
                    content=content,
                    charts_data=None,
                )
                db.add(report)
                db.commit()
                logger.info(f"Report saved: {report_id}")
                return json.dumps({"report_id": report_id, "title": title, "status": "saved"})
            finally:
                db.close()
        except Exception as e:
            return json.dumps({"error": str(e)})

    def get_saved_reports(self, dataset_id: str) -> str:
        """List saved reports for a dataset"""
        try:
            db = self.sqlite.get_session()
            try:
                reports = db.query(Report).filter(
                    Report.dataset_id == dataset_id
                ).order_by(Report.created_at.desc()).all()

                return json.dumps([
                    {
                        "id": r.id,
                        "title": r.title,
                        "report_type": r.report_type,
                        "created_at": str(r.created_at),
                    }
                    for r in reports
                ])
            finally:
                db.close()
        except Exception as e:
            return json.dumps({"error": str(e)})


report_tools = ReportTools()
