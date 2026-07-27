"""
Visualization Tools
Enterprise AI Data Analyst - Agent Tools for Chart Generation
"""
import json
from typing import Optional, List
import pandas as pd
import numpy as np
from app.database.duckdb_client import get_duckdb
from app.utils.logger import logger


class VisualizationTools:
    """Tools available to the Visualization Agent"""

    def __init__(self):
        self.duckdb = get_duckdb()

    def get_column_values(self, table_name: str, column_name: str, limit: int = 1000) -> str:
        """Get all values of a column for charting"""
        try:
            safe_col = column_name.replace('"', '""')
            query = f'SELECT "{safe_col}" FROM "{table_name}" WHERE "{safe_col}" IS NOT NULL LIMIT {limit}'
            df = self.duckdb.query(query)
            if df is None:
                return json.dumps({"error": "Column not found"})
            return json.dumps({"column": column_name, "values": df[column_name].tolist()[:limit]})
        except Exception as e:
            return json.dumps({"error": str(e)})

    def get_grouped_data(self, table_name: str, group_col: str, value_col: str, agg: str = "sum") -> str:
        """Get aggregated data grouped by a column"""
        try:
            safe_grp = group_col.replace('"', '""')
            safe_val = value_col.replace('"', '""')
            agg_fn = agg.upper() if agg.upper() in ("SUM", "AVG", "COUNT", "MIN", "MAX") else "SUM"
            query = f"""
            SELECT "{safe_grp}" as grp, {agg_fn}(CAST("{safe_val}" AS DOUBLE)) as val, COUNT(*) as cnt
            FROM "{table_name}"
            WHERE "{safe_val}" IS NOT NULL
            GROUP BY "{safe_grp}"
            ORDER BY val DESC
            LIMIT 50
            """
            df = self.duckdb.query(query)
            if df is None or df.empty:
                return json.dumps({"error": "No data"})

            data = [
                {"label": str(row["grp"]), "value": round(float(row["val"]), 2), "count": int(row["cnt"])}
                for _, row in df.iterrows()
            ]
            return json.dumps({"group_column": group_col, "value_column": value_col, "aggregation": agg, "data": data}, indent=2)
        except Exception as e:
            return json.dumps({"error": str(e)})

    def get_distribution_data(self, table_name: str, column_name: str, bins: int = 10) -> str:
        """Get histogram/distribution data for a numeric column"""
        try:
            safe_col = column_name.replace('"', '""')
            query = f"""
            SELECT
                FLOOR((CAST("{safe_col}" AS DOUBLE) - (SELECT MIN(CAST("{safe_col}" AS DOUBLE)) FROM "{table_name}"))
                    / ((SELECT MAX(CAST("{safe_col}" AS DOUBLE)) - MIN(CAST("{safe_col}" AS DOUBLE)) FROM "{table_name}") + 0.0001)
                    * {bins}) as bin_idx,
                COUNT(*) as count
            FROM "{table_name}"
            WHERE "{safe_col}" IS NOT NULL
            GROUP BY bin_idx
            ORDER BY bin_idx
            """
            df = self.duckdb.query(query)
            if df is None or df.empty:
                return json.dumps({"error": "No distribution data"})

            data = [{"bin": int(row["bin_idx"]), "count": int(row["count"])} for _, row in df.iterrows()]
            return json.dumps({"column": column_name, "bins": bins, "distribution": data}, indent=2)
        except Exception as e:
            return json.dumps({"error": str(e)})

    def get_scatter_data(self, table_name: str, x_col: str, y_col: str, limit: int = 2000) -> str:
        """Get scatter plot data for two numeric columns"""
        try:
            safe_x = x_col.replace('"', '""')
            safe_y = y_col.replace('"', '""')
            query = f"""
            SELECT CAST("{safe_x}" AS DOUBLE) as x, CAST("{safe_y}" AS DOUBLE) as y
            FROM "{table_name}"
            WHERE "{safe_x}" IS NOT NULL AND "{safe_y}" IS NOT NULL
            LIMIT {limit}
            """
            df = self.duckdb.query(query)
            if df is None or df.empty:
                return json.dumps({"error": "No scatter data"})

            data = [{"x": round(float(r["x"]), 4), "y": round(float(r["y"]), 4)} for _, r in df.iterrows()]
            return json.dumps({"x_column": x_col, "y_column": y_col, "data": data, "count": len(data)}, indent=2)
        except Exception as e:
            return json.dumps({"error": str(e)})

    def get_correlation_matrix(self, table_name: str) -> str:
        """Get correlation matrix for all numeric columns"""
        try:
            info = self.duckdb.get_table_info(table_name)
            if not info:
                return json.dumps({"error": "Table not found"})

            numeric_cols = [
                col["name"] for col in info["columns"]
                if any(t in col["type"].upper() for t in ["INT", "FLOAT", "DOUBLE", "DECIMAL", "NUMERIC", "BIGINT"])
            ]

            if len(numeric_cols) < 2:
                return json.dumps({"message": "Need at least 2 numeric columns"})

            safe_cols = [c.replace('"', '""') for c in numeric_cols]
            select_parts = [f'CAST("{c}" AS DOUBLE) as "{c}"' for c in safe_cols]
            query = f"SELECT {', '.join(select_parts)} FROM \"{table_name}\""
            df = self.duckdb.query(query)

            if df is None or df.empty:
                return json.dumps({"error": "No data"})

            corr = df.corr()
            matrix = {
                "columns": numeric_cols,
                "matrix": [
                    [round(float(corr.iloc[i, j]), 4) for j in range(len(numeric_cols))]
                    for i in range(len(numeric_cols))
                ]
            }
            return json.dumps(matrix, indent=2)
        except Exception as e:
            return json.dumps({"error": str(e)})

    def get_time_series_data(self, table_name: str, date_col: str, value_col: str) -> str:
        """Get time series data for charting"""
        try:
            safe_date = date_col.replace('"', '""')
            safe_val = value_col.replace('"', '""')
            query = f"""
            SELECT "{safe_date}" as dt, AVG(CAST("{safe_val}" AS DOUBLE)) as val, COUNT(*) as cnt
            FROM "{table_name}"
            WHERE "{safe_date}" IS NOT NULL AND "{safe_val}" IS NOT NULL
            GROUP BY "{safe_date}"
            ORDER BY dt
            LIMIT 500
            """
            df = self.duckdb.query(query)
            if df is None or df.empty:
                return json.dumps({"error": "No time series data"})

            data = [
                {"date": str(row["dt"]), "value": round(float(row["val"]), 2), "count": int(row["cnt"])}
                for _, row in df.iterrows()
            ]
            return json.dumps({"date_column": date_col, "value_column": value_col, "data": data}, indent=2)
        except Exception as e:
            return json.dumps({"error": str(e)})


visualization_tools = VisualizationTools()
