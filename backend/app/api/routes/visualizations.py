"""
Visualization Routes
Enterprise AI Data Analyst - Chart Generation API
"""
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel
from typing import List, Optional
from app.utils.logger import logger

router = APIRouter(prefix="/visualizations", tags=["visualizations"])


class FilterSpec(BaseModel):
    column: str
    operator: str
    value: str


class ChartRequest(BaseModel):
    chartType: str
    xAxis: str
    yAxis: str
    aggregation: str = "none"
    colorScheme: str = "default"
    filters: List[FilterSpec] = []
    title: str = ""


@router.post("/generate/{dataset_id}")
async def generate_chart(dataset_id: str, request: ChartRequest) -> dict:
    """
    Generate a chart based on user-specified parameters.
    User chooses chart type, axes, aggregation, color, and filters.
    """
    try:
        from app.services.visualization_service import visualization_service

        table_name = f"dataset_{dataset_id.replace('-', '_')}"
        viz = visualization_service

        chart = None
        chart_type = request.chartType

        if chart_type == "bar":
            chart = viz.generate_bar_chart(table_name, request.xAxis, request.yAxis,
                                           "avg" if request.aggregation != "none" else request.aggregation)
        elif chart_type == "line":
            # Generate a line chart (reuse bar logic with line type)
            base = viz.generate_bar_chart(table_name, request.xAxis, request.yAxis,
                                          "avg" if request.aggregation != "none" else request.aggregation)
            if base:
                base["chart_type"] = "line"
                for d in base["data"]:
                    d["type"] = "scatter"
                    d["mode"] = "lines+markers"
                chart = base
        elif chart_type == "scatter":
            chart = viz.generate_scatter_plot(table_name, request.xAxis, request.yAxis)
        elif chart_type == "pie":
            chart = viz.generate_pie_chart(table_name, request.xAxis)
        elif chart_type == "histogram":
            chart = viz.generate_histogram(table_name, request.yAxis or request.xAxis)
        elif chart_type == "box":
            chart = viz.generate_box_plot(table_name, request.yAxis or request.xAxis,
                                          request.xAxis if request.xAxis != request.yAxis else None)
        elif chart_type == "heatmap":
            chart = viz.generate_correlation_heatmap(table_name)
        elif chart_type == "area":
            base = viz.generate_bar_chart(table_name, request.xAxis, request.yAxis,
                                          "avg" if request.aggregation != "none" else request.aggregation)
            if base:
                base["chart_type"] = "area"
                for d in base["data"]:
                    d["type"] = "scatter"
                    d["mode"] = "lines"
                    d["fill"] = "tozeroy"
                chart = base

        if not chart:
            # Fallback: generate a basic bar chart
            chart = viz.generate_bar_chart(table_name, request.xAxis, request.yAxis,
                                           "avg" if request.aggregation != "none" else request.aggregation)

        if not chart:
            raise HTTPException(status_code=400, detail="Could not generate chart with the given parameters")

        # Override title if provided
        if request.title:
            chart["title"] = request.title
            chart["layout"]["title"]["text"] = request.title

        logger.info(f"Generated {chart_type} chart for {dataset_id}")
        return {
            "success": True,
            "chart_id": chart.get("chart_id", f"chart_{dataset_id}"),
            "data": chart.get("data", []),
            "layout": chart.get("layout", {}),
            "config": chart.get("config", {}),
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Chart generation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
