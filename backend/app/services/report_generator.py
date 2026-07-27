"""
Report Generator Service
Enterprise AI Data Analyst - Professional Report Generation
"""
import json
import uuid
from typing import Optional, Dict, Any, List
from datetime import datetime
from app.database.sqlite_client import get_sqlite
from app.database.models import Dataset, AnalysisResult, Report
from app.utils.logger import logger


class ReportGeneratorService:
    """Service for generating comprehensive analysis reports"""

    def __init__(self):
        pass

    def generate_markdown_report(
        self,
        dataset_id: str,
        analysis_results: Optional[Dict[str, Any]] = None,
    ) -> Optional[Dict[str, Any]]:
        """Generate a full Markdown report from analysis results"""
        try:
            db = get_sqlite().get_session()
            try:
                # Get dataset metadata
                dataset = db.query(Dataset).filter(Dataset.id == dataset_id).first()
                if not dataset:
                    logger.error(f"Dataset not found: {dataset_id}")
                    return None

                # Get stored analysis results if not provided
                if analysis_results is None:
                    results = db.query(AnalysisResult).filter(
                        AnalysisResult.dataset_id == dataset_id
                    ).all()
                    analysis_results = {}
                    for r in results:
                        analysis_results[r.analysis_type] = r.result_data

                # Generate the report
                title = f"Analysis Report: {dataset.filename}"
                content = self._build_markdown(dataset, analysis_results)

                # Save to database
                report_id = str(uuid.uuid4())
                report = Report(
                    id=report_id,
                    dataset_id=dataset_id,
                    report_type="markdown",
                    title=title,
                    content=content,
                    charts_data=analysis_results.get("visualization", {}),
                )
                db.add(report)
                db.commit()

                logger.info(f"Report generated: {report_id}")

                return {
                    "report_id": report_id,
                    "title": title,
                    "content": content,
                    "generated_at": datetime.utcnow().isoformat(),
                    "sections_count": content.count("## "),
                }

            finally:
                db.close()

        except Exception as e:
            logger.error(f"Report generation error: {e}")
            return None

    def _build_markdown(self, dataset, analysis_results: Dict) -> str:
        """Build the Markdown report content"""
        now = datetime.utcnow().strftime("%Y-%m-%d %H:%M UTC")
        sections = []

        # ── Header ──
        sections.append(f"# 📊 Analysis Report: {dataset.filename}\n")
        sections.append(f"*Generated on {now} | Dataset ID: {dataset.id[:8]}...*\n")
        sections.append("---\n")

        # ── Executive Summary ──
        insights = analysis_results.get("insights", {})
        ai_analysis = insights.get("ai_analysis", {})
        exec_summary = ai_analysis.get("executive_summary", "Executive summary pending analysis completion.")
        sections.append("## Executive Summary\n")
        sections.append(f"{exec_summary}\n")

        # ── Dataset Overview ──
        sections.append("## Dataset Overview\n")
        health = analysis_results.get("profiling", {}).get("health_score", {})
        health_score = health.get("overall_score", "N/A") if isinstance(health, dict) else "N/A"

        sections.append("| Metric | Value |")
        sections.append("|--------|-------|")
        sections.append(f"| **Filename** | {dataset.filename} |")
        sections.append(f"| **Total Rows** | {dataset.num_rows:,} |")
        sections.append(f"| **Total Columns** | {dataset.num_columns} |")
        sections.append(f"| **File Size** | {dataset.file_size_bytes / (1024*1024):.2f} MB |")
        sections.append(f"| **Data Quality Score** | {health_score}/100 |")
        sections.append(f"| **Upload Date** | {dataset.upload_date.strftime('%Y-%m-%d %H:%M')} |")
        sections.append("")

        # ── Data Quality Assessment ──
        profiling = analysis_results.get("profiling", {})
        sections.append("## Data Quality Assessment\n")

        if isinstance(health, dict) and "overall_score" in health:
            sections.append("### Health Score Breakdown\n")
            sections.append("| Dimension | Score |")
            sections.append("|-----------|-------|")
            sections.append(f"| **Completeness** | {health.get('completeness', 'N/A')}/100 |")
            if "uniqueness" in health:
                sections.append(f"| **Uniqueness** | {health.get('uniqueness', 'N/A')}/100 |")
            if "consistency" in health:
                sections.append(f"| **Consistency** | {health.get('consistency', 'N/A')}/100 |")
            if "validity" in health:
                sections.append(f"| **Validity** | {health.get('validity', 'N/A')}/100 |")
            sections.append("")

        # Missing values
        missing = profiling.get("missing_values_analysis", {})
        if missing and "columns" in missing:
            sections.append("### Missing Values\n")
            cols_with_missing = {
                k: v for k, v in missing["columns"].items()
                if isinstance(v, dict) and v.get("null_count", 0) > 0
            }
            if cols_with_missing:
                sections.append("| Column | Null Count | Null % |")
                sections.append("|--------|-----------|--------|")
                for col, info in sorted(cols_with_missing.items(), key=lambda x: x[1].get("null_percentage", 0), reverse=True):
                    sections.append(f"| {col} | {info['null_count']:,} | {info['null_percentage']:.1f}% |")
                sections.append("")
            else:
                sections.append("✅ No missing values detected.\n")

        # Duplicates
        dupes = profiling.get("duplicates", {})
        if dupes:
            dup_count = dupes.get("duplicate_count", 0)
            if dup_count > 0:
                sections.append(f"⚠️ **{dup_count:,} duplicate rows** detected ({dupes.get('duplicate_percentage', 0):.1f}% of data)\n")
            else:
                sections.append("✅ No duplicate rows detected.\n")

        # ── Statistical Analysis ──
        analytics = analysis_results.get("analytics", {})
        sections.append("## Statistical Analysis\n")

        # KPIs
        kpis = analytics.get("kpis", [])
        if isinstance(kpis, dict):
            kpis = kpis.get("kpis", [])
        if kpis:
            sections.append("### Key Performance Indicators\n")
            sections.append("| KPI | Value | Unit | Trend |")
            sections.append("|-----|-------|------|-------|")
            for kpi in kpis[:10]:
                if isinstance(kpi, dict):
                    trend_emoji = {"up": "📈", "down": "📉", "stable": "➡️"}.get(kpi.get("trend", ""), "➡️")
                    sections.append(
                        f"| {kpi.get('name', 'N/A')} | {kpi.get('value', 'N/A')} | {kpi.get('unit', '')} | {trend_emoji} {kpi.get('trend', 'N/A')} |"
                    )
            sections.append("")

        # Summary Statistics
        summary = analytics.get("summary_statistics", {})
        if summary and isinstance(summary, dict) and not summary.get("error"):
            sections.append("### Summary Statistics\n")
            sections.append("| Column | Min | Max | Mean | Std Dev | Median |")
            sections.append("|--------|-----|-----|------|---------|--------|")
            for col, stats in list(summary.items())[:15]:
                if isinstance(stats, dict):
                    sections.append(
                        f"| {col} | {stats.get('min', 'N/A')} | {stats.get('max', 'N/A')} | "
                        f"{stats.get('mean', 'N/A')} | {stats.get('std', 'N/A')} | {stats.get('median', 'N/A')} |"
                    )
            sections.append("")

        # Correlations
        correlations = analytics.get("correlations", {})
        if isinstance(correlations, dict):
            corr_data = correlations.get("correlations", correlations)
            if corr_data and isinstance(corr_data, dict) and not corr_data.get("error"):
                sections.append("### Key Correlations\n")
                sorted_corr = sorted(
                    [(k, v) for k, v in corr_data.items() if isinstance(v, (int, float))],
                    key=lambda x: abs(x[1]),
                    reverse=True
                )[:10]
                if sorted_corr:
                    sections.append("| Variable Pair | Correlation |")
                    sections.append("|---------------|-------------|")
                    for pair, val in sorted_corr:
                        strength = "Strong" if abs(val) > 0.7 else "Moderate" if abs(val) > 0.4 else "Weak"
                        direction = "positive" if val > 0 else "negative"
                        sections.append(f"| {pair.replace('__', ' vs ')} | {val:.3f} ({strength} {direction}) |")
                    sections.append("")

        # ── Trends ──
        trends = analytics.get("trends", {})
        if trends and isinstance(trends, dict):
            trend_items = {k: v for k, v in trends.items() if isinstance(v, dict) and v.get("trend") in ("upward", "downward")}
            if trend_items:
                sections.append("## Trend Analysis\n")
                for col, trend in trend_items.items():
                    emoji = "📈" if trend["trend"] == "upward" else "📉"
                    change = trend.get("change_percentage", 0)
                    sections.append(f"- {emoji} **{col}**: {trend['trend'].title()} trend ({change:+.1f}% change, slope: {trend.get('slope', 'N/A')})")
                sections.append("")

        # ── Anomalies ──
        anomalies = analytics.get("anomalies", {})
        if anomalies and isinstance(anomalies, dict):
            anomaly_items = {k: v for k, v in anomalies.items() if isinstance(v, dict) and v.get("outlier_count", 0) > 0}
            if anomaly_items:
                sections.append("## Anomalies & Outliers\n")
                sections.append("| Column | Outlier Count | Outlier % | IQR Bounds |")
                sections.append("|--------|--------------|-----------|------------|")
                for col, info in anomaly_items.items():
                    bounds = info.get("bounds", {})
                    sections.append(
                        f"| {col} | {info['outlier_count']:,} | {info.get('outlier_percentage', 0):.1f}% | "
                        f"[{bounds.get('lower', 'N/A')}, {bounds.get('upper', 'N/A')}] |"
                    )
                sections.append("")

        # ── Business Insights ──
        sections.append("## Business Insights & Recommendations\n")

        key_findings = ai_analysis.get("key_findings", [])
        if key_findings:
            sections.append("### Key Findings\n")
            for i, finding in enumerate(key_findings, 1):
                if isinstance(finding, dict):
                    impact = finding.get("impact", "medium")
                    impact_emoji = {"high": "🔴", "medium": "🟡", "low": "🟢"}.get(impact, "🟡")
                    sections.append(f"{i}. {impact_emoji} **{finding.get('title', 'Finding')}** — {finding.get('description', '')}")
            sections.append("")

        opportunities = ai_analysis.get("opportunities", [])
        if opportunities:
            sections.append("### Opportunities\n")
            for opp in opportunities:
                sections.append(f"- 💡 {opp}")
            sections.append("")

        risks = ai_analysis.get("risks", [])
        if risks:
            sections.append("### Risks\n")
            for risk in risks:
                sections.append(f"- ⚠️ {risk}")
            sections.append("")

        recommendations = ai_analysis.get("recommendations", [])
        if recommendations:
            sections.append("### Recommendations\n")
            for i, rec in enumerate(recommendations, 1):
                sections.append(f"{i}. {rec}")
            sections.append("")

        action_items = ai_analysis.get("action_items", [])
        if action_items:
            sections.append("### Action Items\n")
            sections.append("| Priority | Action | Expected Outcome | Timeline |")
            sections.append("|----------|--------|-----------------|----------|")
            for item in action_items:
                if isinstance(item, dict):
                    priority_emoji = {"high": "🔴", "medium": "🟡", "low": "🟢"}.get(item.get("priority", ""), "🟡")
                    sections.append(
                        f"| {priority_emoji} {item.get('priority', 'N/A')} | {item.get('action', 'N/A')} | "
                        f"{item.get('expected_outcome', 'N/A')} | {item.get('timeline', 'N/A')} |"
                    )
            sections.append("")

        # ── Footer ──
        sections.append("---\n")
        sections.append(f"*Report generated by Enterprise AI Data Analyst | {now}*\n")

        return "\n".join(sections)

    def get_saved_reports(self, dataset_id: str) -> List[Dict[str, Any]]:
        """List all saved reports for a dataset"""
        try:
            db = get_sqlite().get_session()
            try:
                reports = db.query(Report).filter(
                    Report.dataset_id == dataset_id
                ).order_by(Report.created_at.desc()).all()

                return [
                    {
                        "id": r.id,
                        "title": r.title,
                        "report_type": r.report_type,
                        "created_at": r.created_at.isoformat() if r.created_at else None,
                        "content_length": len(r.content) if r.content else 0,
                    }
                    for r in reports
                ]
            finally:
                db.close()
        except Exception as e:
            logger.error(f"Error fetching reports: {e}")
            return []

    def get_report_content(self, report_id: str) -> Optional[Dict[str, Any]]:
        """Get full report content by ID"""
        try:
            db = get_sqlite().get_session()
            try:
                report = db.query(Report).filter(Report.id == report_id).first()
                if not report:
                    return None
                return {
                    "id": report.id,
                    "title": report.title,
                    "report_type": report.report_type,
                    "content": report.content,
                    "created_at": report.created_at.isoformat() if report.created_at else None,
                }
            finally:
                db.close()
        except Exception as e:
            logger.error(f"Error fetching report: {e}")
            return None


report_generator_service = ReportGeneratorService()
