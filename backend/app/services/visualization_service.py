"""
Visualization Service
Enterprise AI Data Analyst - Plotly Chart Generation
"""
import json
from typing import Optional, Dict, Any, List
from app.database.duckdb_client import get_duckdb
from app.utils.logger import logger

# Consistent color palette for charts
COLORS = [
    "#6366f1",  # Indigo
    "#8b5cf6",  # Violet
    "#ec4899",  # Pink
    "#f97316",  # Orange
    "#14b8a6",  # Teal
    "#f43f5e",  # Rose
    "#06b6d4",  # Cyan
    "#84cc16",  # Lime
    "#eab308",  # Yellow
    "#3b82f6",  # Blue
]


class VisualizationService:
    """Service for generating Plotly chart specifications"""

    def __init__(self):
        self.duckdb = get_duckdb()

    def _get_table_name(self, dataset_id: str) -> str:
        return f"dataset_{dataset_id.replace('-', '_')}"

    def _get_columns(self, table_name: str) -> Dict[str, List[str]]:
        """Classify columns by type"""
        info = self.duckdb.get_table_info(table_name)
        if not info:
            return {"numeric": [], "categorical": [], "all": []}

        all_cols = [c["name"] for c in info["columns"]]
        numeric = [
            c["name"] for c in info["columns"]
            if any(t in c.get("type", "").upper() for t in ["INT", "FLOAT", "DOUBLE", "DECIMAL", "NUMERIC", "BIGINT"])
        ]
        categorical = [c for c in all_cols if c not in numeric]

        return {"numeric": numeric, "categorical": categorical, "all": all_cols}

    def generate_bar_chart(self, table_name: str, category_col: str, value_col: str = None, agg: str = "count") -> Optional[Dict]:
        """Generate a bar chart"""
        try:
            safe_cat = category_col.replace('"', '""')

            if value_col and agg:
                safe_val = value_col.replace('"', '""')
                agg_fn = agg.upper() if agg.upper() in ("SUM", "AVG", "COUNT", "MIN", "MAX") else "COUNT"
                query = f"""
                SELECT "{safe_cat}" as cat, {agg_fn}(CAST("{safe_val}" AS DOUBLE)) as val
                FROM "{table_name}" WHERE "{safe_val}" IS NOT NULL
                GROUP BY "{safe_cat}" ORDER BY val DESC LIMIT 20
                """
            else:
                query = f"""
                SELECT "{safe_cat}" as cat, COUNT(*) as val
                FROM "{table_name}" WHERE "{safe_cat}" IS NOT NULL
                GROUP BY "{safe_cat}" ORDER BY val DESC LIMIT 20
                """

            df = self.duckdb.query(query)
            if df is None or df.empty:
                return None

            label = value_col if value_col else "Count"
            title = f"{category_col} Distribution" if not value_col else f"{value_col} by {category_col}"

            return {
                "chart_id": f"bar_{category_col}_{value_col or 'count'}",
                "chart_type": "bar",
                "title": title,
                "data": [{
                    "x": df["cat"].tolist(),
                    "y": [round(float(v), 2) for v in df["val"].tolist()],
                    "type": "bar",
                    "name": label,
                    "marker": {"color": COLORS[0]},
                }],
                "layout": {
                    "title": {"text": title, "font": {"size": 16}},
                    "xaxis": {"title": category_col, "tickangle": -45},
                    "yaxis": {"title": label},
                    "showlegend": False,
                    "template": "plotly_white",
                },
                "config": {"responsive": True, "displayModeBar": True},
            }
        except Exception as e:
            logger.error(f"Bar chart error: {e}")
            return None

    def generate_histogram(self, table_name: str, column: str, bins: int = 15) -> Optional[Dict]:
        """Generate a histogram"""
        try:
            safe_col = column.replace('"', '""')
            query = f"""
            SELECT CAST("{safe_col}" AS DOUBLE) as val
            FROM "{table_name}" WHERE "{safe_col}" IS NOT NULL
            """
            df = self.duckdb.query(query)
            if df is None or df.empty:
                return None

            return {
                "chart_id": f"hist_{column}",
                "chart_type": "histogram",
                "title": f"Distribution of {column}",
                "data": [{
                    "x": [round(float(v), 4) for v in df["val"].tolist()],
                    "type": "histogram",
                    "nbinsx": bins,
                    "marker": {"color": COLORS[1], "opacity": 0.7},
                }],
                "layout": {
                    "title": {"text": f"Distribution of {column}", "font": {"size": 16}},
                    "xaxis": {"title": column},
                    "yaxis": {"title": "Frequency"},
                    "showlegend": False,
                    "template": "plotly_white",
                },
                "config": {"responsive": True, "displayModeBar": True},
            }
        except Exception as e:
            logger.error(f"Histogram error: {e}")
            return None

    def generate_scatter_plot(self, table_name: str, x_col: str, y_col: str, color_col: str = None) -> Optional[Dict]:
        """Generate a scatter plot"""
        try:
            safe_x = x_col.replace('"', '""')
            safe_y = y_col.replace('"', '""')

            query = f"""
            SELECT CAST("{safe_x}" AS DOUBLE) as x, CAST("{safe_y}" AS DOUBLE) as y
            FROM "{table_name}"
            WHERE "{safe_x}" IS NOT NULL AND "{safe_y}" IS NOT NULL
            LIMIT 2000
            """
            df = self.duckdb.query(query)
            if df is None or df.empty:
                return None

            return {
                "chart_id": f"scatter_{x_col}_{y_col}",
                "chart_type": "scatter",
                "title": f"{y_col} vs {x_col}",
                "data": [{
                    "x": [round(float(v), 4) for v in df["x"].tolist()],
                    "y": [round(float(v), 4) for v in df["y"].tolist()],
                    "mode": "markers",
                    "type": "scatter",
                    "name": f"{y_col} vs {x_col}",
                    "marker": {"color": COLORS[2], "size": 6, "opacity": 0.6},
                }],
                "layout": {
                    "title": {"text": f"{y_col} vs {x_col}", "font": {"size": 16}},
                    "xaxis": {"title": x_col},
                    "yaxis": {"title": y_col},
                    "template": "plotly_white",
                },
                "config": {"responsive": True, "displayModeBar": True},
            }
        except Exception as e:
            logger.error(f"Scatter plot error: {e}")
            return None

    def generate_pie_chart(self, table_name: str, column: str, limit: int = 8) -> Optional[Dict]:
        """Generate a pie chart"""
        try:
            safe_col = column.replace('"', '""')
            query = f"""
            SELECT "{safe_col}" as cat, COUNT(*) as cnt
            FROM "{table_name}" WHERE "{safe_col}" IS NOT NULL
            GROUP BY "{safe_col}" ORDER BY cnt DESC LIMIT {limit}
            """
            df = self.duckdb.query(query)
            if df is None or df.empty:
                return None

            return {
                "chart_id": f"pie_{column}",
                "chart_type": "pie",
                "title": f"{column} Composition",
                "data": [{
                    "labels": df["cat"].tolist(),
                    "values": [int(v) for v in df["cnt"].tolist()],
                    "type": "pie",
                    "hole": 0.3,
                    "marker": {"colors": COLORS[:len(df)]},
                }],
                "layout": {
                    "title": {"text": f"{column} Composition", "font": {"size": 16}},
                    "showlegend": True,
                    "template": "plotly_white",
                },
                "config": {"responsive": True, "displayModeBar": True},
            }
        except Exception as e:
            logger.error(f"Pie chart error: {e}")
            return None

    def generate_box_plot(self, table_name: str, numeric_col: str, group_col: str = None) -> Optional[Dict]:
        """Generate a box plot"""
        try:
            safe_num = numeric_col.replace('"', '""')

            if group_col:
                safe_grp = group_col.replace('"', '""')
                query = f"""
                SELECT "{safe_grp}" as grp, CAST("{safe_num}" AS DOUBLE) as val
                FROM "{table_name}" WHERE "{safe_num}" IS NOT NULL
                LIMIT 5000
                """
                df = self.duckdb.query(query)
                if df is None or df.empty:
                    return None

                groups = df["grp"].unique()
                data = []
                for i, grp in enumerate(groups):
                    grp_data = df[df["grp"] == grp]["val"].tolist()
                    data.append({
                        "y": [round(float(v), 4) for v in grp_data],
                        "type": "box",
                        "name": str(grp),
                        "marker": {"color": COLORS[i % len(COLORS)]},
                    })

                title = f"{numeric_col} Distribution by {group_col}"
            else:
                query = f"""
                SELECT CAST("{safe_num}" AS DOUBLE) as val
                FROM "{table_name}" WHERE "{safe_num}" IS NOT NULL
                LIMIT 5000
                """
                df = self.duckdb.query(query)
                if df is None or df.empty:
                    return None

                data = [{
                    "y": [round(float(v), 4) for v in df["val"].tolist()],
                    "type": "box",
                    "name": numeric_col,
                    "marker": {"color": COLORS[3]},
                }]
                title = f"{numeric_col} Distribution"

            return {
                "chart_id": f"box_{numeric_col}_{group_col or 'all'}",
                "chart_type": "box",
                "title": title,
                "data": data,
                "layout": {
                    "title": {"text": title, "font": {"size": 16}},
                    "yaxis": {"title": numeric_col},
                    "template": "plotly_white",
                },
                "config": {"responsive": True, "displayModeBar": True},
            }
        except Exception as e:
            logger.error(f"Box plot error: {e}")
            return None

    def generate_correlation_heatmap(self, table_name: str) -> Optional[Dict]:
        """Generate a correlation heatmap"""
        try:
            info = self.duckdb.get_table_info(table_name)
            if not info:
                return None

            numeric_cols = [
                c["name"] for c in info["columns"]
                if any(t in c.get("type", "").upper() for t in ["INT", "FLOAT", "DOUBLE", "DECIMAL", "NUMERIC", "BIGINT"])
            ]

            if len(numeric_cols) < 2:
                return None

            safe_cols = [c.replace('"', '""') for c in numeric_cols]
            select = ", ".join([f'CAST("{c}" AS DOUBLE) as "{c}"' for c in safe_cols])
            df = self.duckdb.query(f"SELECT {select} FROM \"{table_name}\"")
            if df is None or df.empty:
                return None

            corr = df.corr()

            return {
                "chart_id": "correlation_heatmap",
                "chart_type": "heatmap",
                "title": "Correlation Matrix",
                "data": [{
                    "z": [[round(float(corr.iloc[i, j]), 3) for j in range(len(numeric_cols))] for i in range(len(numeric_cols))],
                    "x": numeric_cols,
                    "y": numeric_cols,
                    "type": "heatmap",
                    "colorscale": "RdBu_r",
                    "zmin": -1,
                    "zmax": 1,
                    "text": [[str(round(float(corr.iloc[i, j]), 2)) for j in range(len(numeric_cols))] for i in range(len(numeric_cols))],
                    "texttemplate": "%{text}",
                    "hovertemplate": "%{x} vs %{y}: %{z:.3f}<extra></extra>",
                }],
                "layout": {
                    "title": {"text": "Correlation Matrix", "font": {"size": 16}},
                    "template": "plotly_white",
                    "height": max(400, len(numeric_cols) * 60),
                },
                "config": {"responsive": True, "displayModeBar": True},
            }
        except Exception as e:
            logger.error(f"Heatmap error: {e}")
            return None

    def generate_all_charts(self, dataset_id: str) -> List[Dict]:
        """Auto-generate a comprehensive set of charts for a dataset"""
        table = self._get_table_name(dataset_id)
        cols = self._get_columns(table)
        charts = []

        # Bar charts for categorical columns
        for col in cols["categorical"][:3]:
            chart = self.generate_bar_chart(table, col)
            if chart:
                charts.append(chart)

        # Histograms for numeric columns
        for col in cols["numeric"][:3]:
            chart = self.generate_histogram(table, col)
            if chart:
                charts.append(chart)

        # Scatter plot for first two numeric columns
        if len(cols["numeric"]) >= 2:
            chart = self.generate_scatter_plot(table, cols["numeric"][0], cols["numeric"][1])
            if chart:
                charts.append(chart)

        # Pie chart for first categorical with few values
        if cols["categorical"]:
            chart = self.generate_pie_chart(table, cols["categorical"][0])
            if chart:
                charts.append(chart)

        # Box plots
        if cols["numeric"] and cols["categorical"]:
            chart = self.generate_box_plot(table, cols["numeric"][0], cols["categorical"][0])
            if chart:
                charts.append(chart)
        elif cols["numeric"]:
            chart = self.generate_box_plot(table, cols["numeric"][0])
            if chart:
                charts.append(chart)

        # Correlation heatmap
        if len(cols["numeric"]) >= 2:
            chart = self.generate_correlation_heatmap(table)
            if chart:
                charts.append(chart)

        logger.info(f"Generated {len(charts)} charts for {dataset_id}")
        return charts


visualization_service = VisualizationService()
