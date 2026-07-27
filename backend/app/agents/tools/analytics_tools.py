"""
Analytics Tools
Enterprise AI Data Analyst - Agent Tools for Statistical Analysis & KPIs
"""
import json
from typing import Optional
import pandas as pd
import numpy as np
from app.database.duckdb_client import get_duckdb
from app.utils.logger import logger


class AnalyticsTools:
    """Tools available to the Analytics Agent"""

    def __init__(self):
        self.duckdb = get_duckdb()

    def get_summary_statistics(self, table_name: str) -> str:
        """Get summary statistics for all numeric columns"""
        try:
            info = self.duckdb.get_table_info(table_name)
            if not info:
                return json.dumps({"error": "Table not found"})

            numeric_cols = [
                col["name"] for col in info["columns"]
                if any(t in col["type"].upper() for t in ["INT", "FLOAT", "DOUBLE", "DECIMAL", "NUMERIC", "BIGINT"])
            ]

            if not numeric_cols:
                return json.dumps({"message": "No numeric columns found", "columns": [c["name"] for c in info["columns"]]})

            select_parts = []
            for col in numeric_cols:
                safe = col.replace('"', '""')
                select_parts.extend([
                    f'COUNT("{safe}") as "{safe}_count"',
                    f'MIN(CAST("{safe}" AS DOUBLE)) as "{safe}_min"',
                    f'MAX(CAST("{safe}" AS DOUBLE)) as "{safe}_max"',
                    f'AVG(CAST("{safe}" AS DOUBLE)) as "{safe}_mean"',
                    f'STDDEV(CAST("{safe}" AS DOUBLE)) as "{safe}_std"',
                    f'MEDIAN(CAST("{safe}" AS DOUBLE)) as "{safe}_median"',
                ])

            query = f"SELECT {', '.join(select_parts)} FROM \"{table_name}\""
            df = self.duckdb.query(query)

            if df is None or df.empty:
                return json.dumps({"error": "Could not compute statistics"})

            row = df.iloc[0]
            stats = {}
            for col in numeric_cols:
                stats[col] = {
                    "count": int(row.get(f"{col}_count", 0)),
                    "min": float(row[f"{col}_min"]) if pd.notna(row.get(f"{col}_min")) else None,
                    "max": float(row[f"{col}_max"]) if pd.notna(row.get(f"{col}_max")) else None,
                    "mean": round(float(row[f"{col}_mean"]), 4) if pd.notna(row.get(f"{col}_mean")) else None,
                    "std": round(float(row[f"{col}_std"]), 4) if pd.notna(row.get(f"{col}_std")) else None,
                    "median": float(row[f"{col}_median"]) if pd.notna(row.get(f"{col}_median")) else None,
                }

            return json.dumps(stats, indent=2)
        except Exception as e:
            logger.error(f"get_summary_statistics error: {e}")
            return json.dumps({"error": str(e)})

    def compute_correlations(self, table_name: str) -> str:
        """Compute pairwise correlations between numeric columns"""
        try:
            info = self.duckdb.get_table_info(table_name)
            if not info:
                return json.dumps({"error": "Table not found"})

            numeric_cols = [
                col["name"] for col in info["columns"]
                if any(t in col["type"].upper() for t in ["INT", "FLOAT", "DOUBLE", "DECIMAL", "NUMERIC", "BIGINT"])
            ]

            if len(numeric_cols) < 2:
                return json.dumps({"message": "Need at least 2 numeric columns for correlation"})

            # Use DuckDB correlation function
            select_parts = []
            for i, c1 in enumerate(numeric_cols):
                for c2 in numeric_cols[i+1:]:
                    safe1 = c1.replace('"', '""')
                    safe2 = c2.replace('"', '""')
                    select_parts.append(
                        f'CORR(CAST("{safe1}" AS DOUBLE), CAST("{safe2}" AS DOUBLE)) as "{safe1}__{safe2}"'
                    )

            query = f"SELECT {', '.join(select_parts)} FROM \"{table_name}\""
            df = self.duckdb.query(query)

            if df is None or df.empty:
                return json.dumps({"correlations": {}})

            row = df.iloc[0]
            correlations = {}
            for key, val in row.items():
                if pd.notna(val):
                    correlations[key] = round(float(val), 4)

            return json.dumps({"correlations": correlations}, indent=2)
        except Exception as e:
            logger.error(f"compute_correlations error: {e}")
            return json.dumps({"error": str(e)})

    def detect_trends(self, table_name: str, value_column: str, group_column: Optional[str] = None) -> str:
        """Detect trends in a value column, optionally grouped"""
        try:
            safe_val = value_column.replace('"', '""')

            if group_column:
                safe_grp = group_column.replace('"', '""')
                query = f"""
                SELECT "{safe_grp}" as grp,
                       AVG(CAST("{safe_val}" AS DOUBLE)) as avg_val,
                       COUNT(*) as cnt
                FROM "{table_name}"
                WHERE "{safe_val}" IS NOT NULL
                GROUP BY "{safe_grp}"
                ORDER BY grp
                """
            else:
                query = f"""
                SELECT AVG(CAST("{safe_val}" AS DOUBLE)) as avg_val, COUNT(*) as cnt
                FROM "{table_name}"
                WHERE "{safe_val}" IS NOT NULL
                """

            df = self.duckdb.query(query)
            if df is None or df.empty:
                return json.dumps({"message": "No data to analyze"})

            values = df["avg_val"].dropna().tolist()
            if len(values) < 2:
                return json.dumps({"trend": "insufficient_data", "data_points": len(values)})

            # Simple linear trend detection
            n = len(values)
            x = np.arange(n)
            y = np.array(values, dtype=float)
            slope = float(np.polyfit(x, y, 1)[0])

            if slope > 0.01 * np.mean(np.abs(y)):
                trend = "upward"
            elif slope < -0.01 * np.mean(np.abs(y)):
                trend = "downward"
            else:
                trend = "stable"

            result = {
                "trend": trend,
                "slope": round(slope, 4),
                "data_points": n,
                "start_value": round(float(values[0]), 4),
                "end_value": round(float(values[-1]), 4),
                "change_percentage": round(((values[-1] - values[0]) / abs(values[0]) * 100) if values[0] != 0 else 0, 2),
            }

            if group_column:
                result["groups"] = [
                    {"group": str(row["grp"]), "avg": round(float(row["avg_val"]), 4), "count": int(row["cnt"])}
                    for _, row in df.iterrows()
                ]

            return json.dumps(result, indent=2)
        except Exception as e:
            logger.error(f"detect_trends error: {e}")
            return json.dumps({"error": str(e)})

    def detect_anomalies(self, table_name: str, column_name: str) -> str:
        """Detect statistical outliers in a column using IQR method"""
        try:
            safe_col = column_name.replace('"', '""')
            query = f"""
            SELECT CAST("{safe_col}" AS DOUBLE) as val
            FROM "{table_name}"
            WHERE "{safe_col}" IS NOT NULL
            """
            df = self.duckdb.query(query)
            if df is None or df.empty:
                return json.dumps({"anomalies": [], "count": 0})

            vals = df["val"].dropna()
            if len(vals) < 10:
                return json.dumps({"anomalies": [], "count": 0, "message": "Insufficient data for anomaly detection"})

            q1 = float(vals.quantile(0.25))
            q3 = float(vals.quantile(0.75))
            iqr = q3 - q1
            lower = q1 - 1.5 * iqr
            upper = q3 + 1.5 * iqr

            outliers = vals[(vals < lower) | (vals > upper)]

            return json.dumps({
                "column": column_name,
                "outlier_count": len(outliers),
                "outlier_percentage": round(len(outliers) / len(vals) * 100, 2),
                "bounds": {"lower": round(lower, 4), "upper": round(upper, 4)},
                "sample_outliers": [round(float(v), 4) for v in outliers.head(20).tolist()],
            }, indent=2)
        except Exception as e:
            logger.error(f"detect_anomalies error: {e}")
            return json.dumps({"error": str(e)})

    def compute_kpis(self, table_name: str) -> str:
        """Auto-detect and compute key performance indicators"""
        try:
            info = self.duckdb.get_table_info(table_name)
            if not info:
                return json.dumps({"error": "Table not found"})

            row_count = info["row_count"]
            numeric_cols = [
                col["name"] for col in info["columns"]
                if any(t in col["type"].upper() for t in ["INT", "FLOAT", "DOUBLE", "DECIMAL", "NUMERIC", "BIGINT"])
            ]

            kpis = [{"name": "Total Records", "value": row_count, "unit": "rows", "trend": "stable"}]

            for col in numeric_cols[:8]:  # Limit to top 8 numeric columns
                safe = col.replace('"', '""')
                query = f"""
                SELECT
                    SUM(CAST("{safe}" AS DOUBLE)) as total,
                    AVG(CAST("{safe}" AS DOUBLE)) as avg,
                    MAX(CAST("{safe}" AS DOUBLE)) as max_val
                FROM "{table_name}"
                WHERE "{safe}" IS NOT NULL
                """
                df = self.duckdb.query(query)
                if df is not None and not df.empty:
                    row = df.iloc[0]
                    if pd.notna(row["total"]):
                        kpis.append({
                            "name": f"Total {col}",
                            "value": round(float(row["total"]), 2),
                            "unit": "sum",
                            "trend": "stable",
                        })
                    if pd.notna(row["avg"]):
                        kpis.append({
                            "name": f"Average {col}",
                            "value": round(float(row["avg"]), 2),
                            "unit": "avg",
                            "trend": "stable",
                        })

            return json.dumps({"kpis": kpis}, indent=2)
        except Exception as e:
            logger.error(f"compute_kpis error: {e}")
            return json.dumps({"error": str(e)})


analytics_tools = AnalyticsTools()
