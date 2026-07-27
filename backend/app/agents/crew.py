"""
CrewAI Agent Orchestration
Enterprise AI Data Analyst - Multi-Agent Analysis Pipeline
"""
import json
import time
import uuid
from typing import Optional, Dict, Any, List
from app.services.ai_service import ai_service
from app.database.duckdb_client import get_duckdb
from app.database.sqlite_client import get_sqlite
from app.database.models import Dataset, AnalysisResult
from app.agents.tools.data_tools import data_profiling_tools
from app.agents.tools.analytics_tools import analytics_tools
from app.agents.tools.visualization_tools import visualization_tools
from app.agents.tools.report_tools import report_tools
from app.agents.prompts.data_profiling_prompt import SYSTEM_PROMPT as PROFILING_PROMPT
from app.agents.prompts.analytics_prompt import SYSTEM_PROMPT as ANALYTICS_PROMPT
from app.agents.prompts.visualization_prompt import SYSTEM_PROMPT as VISUALIZATION_PROMPT
from app.agents.prompts.insights_prompt import SYSTEM_PROMPT as INSIGHTS_PROMPT
from app.utils.logger import logger


class AnalysisCrew:
    """
    Orchestrates the multi-agent analysis pipeline.

    Instead of using CrewAI's framework (which adds complexity and dependency issues),
    we implement a lightweight sequential pipeline that calls each agent in order,
    passing context between them.
    """

    def __init__(self):
        self.duckdb = get_duckdb()

    def _get_table_name(self, dataset_id: str) -> str:
        """Convert dataset_id to DuckDB table name"""
        return f"dataset_{dataset_id.replace('-', '_')}"

    async def _call_agent(
        self,
        system_prompt: str,
        user_prompt: str,
        provider: Optional[str] = None,
        model: Optional[str] = None,
    ) -> Optional[str]:
        """Call an AI agent via the AI service"""
        return await ai_service.generate_completion(
            prompt=user_prompt,
            system_prompt=system_prompt,
            provider=provider,
            model=model,
        )

    def _call_tool(self, tool_fn, *args, **kwargs) -> Dict[str, Any]:
        """Call a tool and parse its JSON result"""
        try:
            result = tool_fn(*args, **kwargs)
            return json.loads(result)
        except Exception as e:
            logger.error(f"Tool call failed: {e}")
            return {"error": str(e)}

    # ──────────────────────────────────────────────
    # Agent 1: Data Profiling
    # ──────────────────────────────────────────────
    async def run_profiling(self, dataset_id: str, provider: str = None, model: str = None) -> Dict[str, Any]:
        """Run data profiling agent"""
        logger.info(f"Starting data profiling: {dataset_id}")
        table = self._get_table_name(dataset_id)

        # Step 1: Collect profiling data via tools
        schema = self._call_tool(data_profiling_tools.get_table_schema, table)
        health = self._call_tool(data_profiling_tools.compute_health_score, table)
        missing = self._call_tool(data_profiling_tools.get_missing_values_summary, table)
        duplicates = self._call_tool(data_profiling_tools.detect_duplicates, table)

        # Collect per-column stats
        column_stats = {}
        if "columns" in schema:
            for col in schema["columns"][:20]:  # Limit to 20 columns
                stats = self._call_tool(data_profiling_tools.get_column_statistics, table, col["name"])
                column_stats[col["name"]] = stats

        # Step 2: Ask the AI agent to interpret the profiling data
        tool_context = {
            "schema": schema,
            "health_score": health,
            "missing_values": missing,
            "duplicates": duplicates,
            "column_statistics_sample": {k: v for k, v in list(column_stats.items())[:5]},
        }

        user_prompt = f"""Analyze this dataset profiling data and provide a comprehensive data quality assessment:

{json.dumps(tool_context, indent=2, default=str)}

Provide your response as JSON matching the expected output format."""

        ai_response = await self._call_agent(PROFILING_PROMPT, user_prompt, provider, model)

        # Parse AI response or fall back to tool data
        try:
            ai_result = json.loads(ai_response) if ai_response else {}
        except json.JSONDecodeError:
            ai_result = {"ai_analysis": ai_response}

        return {
            "health_score": health,
            "column_statistics": column_stats,
            "missing_values_analysis": missing,
            "duplicates": duplicates,
            "ai_analysis": ai_result,
            "schema": schema,
        }

    # ──────────────────────────────────────────────
    # Agent 2: Analytics
    # ──────────────────────────────────────────────
    async def run_analytics(self, dataset_id: str, provider: str = None, model: str = None) -> Dict[str, Any]:
        """Run analytics agent"""
        logger.info(f"Starting analytics: {dataset_id}")
        table = self._get_table_name(dataset_id)

        # Collect analytics data via tools
        summary = self._call_tool(analytics_tools.get_summary_statistics, table)
        correlations = self._call_tool(analytics_tools.compute_correlations, table)
        kpis = self._call_tool(analytics_tools.compute_kpis, table)

        # Detect anomalies for numeric columns
        schema = self._call_tool(data_profiling_tools.get_table_schema, table)
        anomalies = {}
        if "columns" in schema:
            numeric_cols = [
                c["name"] for c in schema["columns"]
                if any(t in c.get("type", "").upper() for t in ["INT", "FLOAT", "DOUBLE", "DECIMAL", "NUMERIC"])
            ]
            for col in numeric_cols[:5]:
                result = self._call_tool(analytics_tools.detect_anomalies, table, col)
                if result.get("outlier_count", 0) > 0:
                    anomalies[col] = result

        # Trends for key columns
        trends = {}
        if "columns" in schema:
            numeric_cols = [
                c["name"] for c in schema["columns"]
                if any(t in c.get("type", "").upper() for t in ["INT", "FLOAT", "DOUBLE", "DECIMAL", "NUMERIC"])
            ]
            for col in numeric_cols[:3]:
                result = self._call_tool(analytics_tools.detect_trends, table, col)
                if result.get("trend") in ("upward", "downward"):
                    trends[col] = result

        tool_context = {
            "summary_statistics": summary,
            "correlations": correlations,
            "kpis": kpis,
            "anomalies": anomalies,
            "trends": trends,
        }

        user_prompt = f"""Analyze this statistical data and extract meaningful business insights:

{json.dumps(tool_context, indent=2, default=str)}

Provide your response as JSON matching the expected output format with KPIs, trends, anomalies, insights, and recommendations."""

        ai_response = await self._call_agent(ANALYTICS_PROMPT, user_prompt, provider, model)

        try:
            ai_result = json.loads(ai_response) if ai_response else {}
        except json.JSONDecodeError:
            ai_result = {"ai_analysis": ai_response}

        return {
            "summary_statistics": summary,
            "correlations": correlations,
            "kpis": kpis,
            "anomalies": anomalies,
            "trends": trends,
            "ai_analysis": ai_result,
        }

    # ──────────────────────────────────────────────
    # Agent 3: Visualization
    # ──────────────────────────────────────────────
    async def run_visualization(self, dataset_id: str, provider: str = None, model: str = None) -> Dict[str, Any]:
        """Run visualization agent — generates Plotly charts using visualization_service"""
        logger.info(f"Starting visualization: {dataset_id}")
        table = self._get_table_name(dataset_id)

        # Generate proper Plotly chart specifications via the visualization service
        from app.services.visualization_service import visualization_service
        charts = visualization_service.generate_all_charts(dataset_id)

        schema = self._call_tool(data_profiling_tools.get_table_schema, table)

        # Try to get AI commentary on the charts
        ai_result = {}
        if provider and model:
            user_prompt = f"""Based on this dataset and its charts, provide a brief summary of what the visualizations reveal.

Dataset schema: {json.dumps(schema, indent=2, default=str)}

Charts generated: {len(charts)} ({[c['chart_type'] for c in charts]})

Provide your response as JSON with a 'summary' field and 'chart_insights' list."""

            ai_response = await self._call_agent(VISUALIZATION_PROMPT, user_prompt, provider, model)
            try:
                ai_result = json.loads(ai_response) if ai_response else {}
            except json.JSONDecodeError:
                ai_result = {"ai_analysis": ai_response}

        return {
            "charts": charts,
            "schema": schema,
            "ai_analysis": ai_result,
        }

    # ──────────────────────────────────────────────
    # Agent 4: Business Insights
    # ──────────────────────────────────────────────
    async def run_insights(
        self,
        dataset_id: str,
        profiling_result: Dict,
        analytics_result: Dict,
        visualization_result: Dict,
        provider: str = None,
        model: str = None,
    ) -> Dict[str, Any]:
        """Run business insights agent — takes outputs from previous agents"""
        logger.info(f"Starting business insights: {dataset_id}")

        # Combine all previous agent outputs
        context = {
            "profiling": {
                "health_score": profiling_result.get("health_score"),
                "duplicates": profiling_result.get("duplicates"),
                "missing_values": profiling_result.get("missing_values_analysis"),
            },
            "analytics": {
                "kpis": analytics_result.get("kpis"),
                "correlations": analytics_result.get("correlations"),
                "trends": analytics_result.get("trends"),
                "anomalies": analytics_result.get("anomalies"),
                "summary_statistics": analytics_result.get("summary_statistics"),
            },
            "visualizations": {
                "chart_count": len(visualization_result.get("chart_data", {})),
                "chart_types": list(visualization_result.get("chart_data", {}).keys()),
            },
        }

        user_prompt = f"""Based on comprehensive analysis results, generate executive-level business insights and recommendations.

Analysis Context:
{json.dumps(context, indent=2, default=str)}

Provide your response as JSON matching the expected business insights output format with executive summary, key findings, opportunities, risks, recommendations, and action items."""

        ai_response = await self._call_agent(INSIGHTS_PROMPT, user_prompt, provider, model)

        try:
            ai_result = json.loads(ai_response) if ai_response else {}
        except json.JSONDecodeError:
            ai_result = {"ai_analysis": ai_response}

        return {
            "context": context,
            "ai_analysis": ai_result,
        }

    # ──────────────────────────────────────────────
    # Full Pipeline
    # ──────────────────────────────────────────────
    async def run_full_analysis(
        self,
        dataset_id: str,
        analysis_types: List[str] = None,
        provider: str = None,
        model: str = None,
    ) -> Dict[str, Any]:
        """Run the full multi-agent analysis pipeline"""
        start_time = time.time()

        if analysis_types is None:
            analysis_types = ["profiling", "analytics", "visualization", "insights"]

        results = {}
        db = get_sqlite().get_session()

        try:
            # Update dataset status
            dataset = db.query(Dataset).filter(Dataset.id == dataset_id).first()
            if dataset:
                dataset.analysis_status = "processing"
                db.commit()

            # Agent 1: Data Profiling
            if "profiling" in analysis_types:
                results["profiling"] = await self.run_profiling(dataset_id, provider, model)
                self._store_result(db, dataset_id, "profiling", results["profiling"], start_time)

            # Agent 2: Analytics
            if "analytics" in analysis_types:
                results["analytics"] = await self.run_analytics(dataset_id, provider, model)
                self._store_result(db, dataset_id, "analytics", results["analytics"], start_time)

            # Agent 3: Visualization
            if "visualization" in analysis_types:
                results["visualization"] = await self.run_visualization(dataset_id, provider, model)
                self._store_result(db, dataset_id, "visualization", results["visualization"], start_time)

            # Agent 4: Business Insights (depends on profiling + analytics + viz)
            if "insights" in analysis_types and all(k in results for k in ["profiling", "analytics", "visualization"]):
                results["insights"] = await self.run_insights(
                    dataset_id,
                    results["profiling"],
                    results["analytics"],
                    results["visualization"],
                    provider,
                    model,
                )
                self._store_result(db, dataset_id, "insights", results["insights"], start_time)

            # Update dataset status
            if dataset:
                dataset.analysis_status = "completed"
                health = results.get("profiling", {}).get("health_score", {})
                if isinstance(health, dict):
                    dataset.health_score = health.get("overall_score", 0)
                db.commit()

            processing_time = time.time() - start_time
            results["processing_time_seconds"] = round(processing_time, 2)

            logger.info(f"Full analysis completed: {dataset_id} in {processing_time:.2f}s")
            return results

        except Exception as e:
            logger.error(f"Analysis pipeline failed: {e}")
            if dataset:
                dataset.analysis_status = "failed"
                dataset.error_message = str(e)
                db.commit()
            raise
        finally:
            db.close()

    def _store_result(self, db, dataset_id: str, analysis_type: str, result_data: Dict, start_time: float):
        """Store analysis result in SQLite"""
        try:
            analysis = AnalysisResult(
                id=str(uuid.uuid4()),
                dataset_id=dataset_id,
                analysis_type=analysis_type,
                result_data=result_data,
                processing_time_seconds=time.time() - start_time,
            )
            db.add(analysis)
            db.commit()
            logger.info(f"Stored {analysis_type} result for {dataset_id}")
        except Exception as e:
            logger.error(f"Failed to store result: {e}")


# Singleton
analysis_crew = AnalysisCrew()
