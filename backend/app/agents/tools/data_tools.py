"""
Data Profiling Tools
Enterprise AI Data Analyst - Agent Tools for Data Quality Analysis
"""
import json
from typing import Optional
import pandas as pd
import numpy as np
from app.database.duckdb_client import get_duckdb
from app.utils.logger import logger


class DataProfilingTools:
    """Tools available to the Data Profiling Agent"""

    def __init__(self):
        self.duckdb = get_duckdb()

    def get_table_schema(self, table_name: str) -> str:
        """Get full schema of a table"""
        try:
            info = self.duckdb.get_table_info(table_name)
            if info:
                return json.dumps(info, indent=2)
            return json.dumps({"error": "Table not found"})
        except Exception as e:
            logger.error(f"get_table_schema error: {e}")
            return json.dumps({"error": str(e)})

    def get_column_statistics(self, table_name: str, column_name: str) -> str:
        """Get detailed statistics for a specific column"""
        try:
            # General stats
            stats = self.duckdb.get_statistics(table_name, column_name)
            if not stats:
                return json.dumps({"error": "Could not compute statistics"})

            # Try numeric stats
            numeric_query = f"""
            SELECT
                MIN(CAST("{column_name}" AS DOUBLE)) as min_val,
                MAX(CAST("{column_name}" AS DOUBLE)) as max_val,
                AVG(CAST("{column_name}" AS DOUBLE)) as mean_val,
                STDDEV(CAST("{column_name}" AS DOUBLE)) as stddev_val,
                MEDIAN(CAST("{column_name}" AS DOUBLE)) as median_val
            FROM "{table_name}"
            WHERE "{column_name}" IS NOT NULL
            """

            try:
                numeric_df = self.duckdb.query(numeric_query)
                if numeric_df is not None and not numeric_df.empty:
                    row = numeric_df.iloc[0]
                    stats["numeric_stats"] = {
                        "min": float(row["min_val"]) if pd.notna(row["min_val"]) else None,
                        "max": float(row["max_val"]) if pd.notna(row["max_val"]) else None,
                        "mean": float(row["mean_val"]) if pd.notna(row["mean_val"]) else None,
                        "stddev": float(row["stddev_val"]) if pd.notna(row["stddev_val"]) else None,
                        "median": float(row["median_val"]) if pd.notna(row["median_val"]) else None,
                    }
            except Exception:
                # Not a numeric column — that's fine
                pass

            # Top values for categorical
            top_values_query = f"""
            SELECT "{column_name}" as val, COUNT(*) as cnt
            FROM "{table_name}"
            WHERE "{column_name}" IS NOT NULL
            GROUP BY "{column_name}"
            ORDER BY cnt DESC
            LIMIT 10
            """
            try:
                top_df = self.duckdb.query(top_values_query)
                if top_df is not None and not top_df.empty:
                    stats["top_values"] = [
                        {"value": str(row["val"]), "count": int(row["cnt"])}
                        for _, row in top_df.iterrows()
                    ]
            except Exception:
                pass

            return json.dumps(stats, indent=2)
        except Exception as e:
            logger.error(f"get_column_statistics error: {e}")
            return json.dumps({"error": str(e)})

    def detect_duplicates(self, table_name: str) -> str:
        """Count and sample duplicate rows"""
        try:
            count_query = f"""
            SELECT COUNT(*) - COUNT(DISTINCT *) as dup_count
            FROM "{table_name}"
            """
            df = self.duckdb.query(count_query)
            dup_count = int(df.iloc[0, 0]) if df is not None else 0

            result = {
                "duplicate_count": dup_count,
                "has_duplicates": dup_count > 0,
            }

            if dup_count > 0:
                pct = dup_count / max(self.duckdb.get_table_info(table_name).get("row_count", 1), 1) * 100
                result["duplicate_percentage"] = round(pct, 2)

            return json.dumps(result, indent=2)
        except Exception as e:
            logger.error(f"detect_duplicates error: {e}")
            return json.dumps({"error": str(e)})

    def get_missing_values_summary(self, table_name: str) -> str:
        """Get missing values per column"""
        try:
            info = self.duckdb.get_table_info(table_name)
            if not info:
                return json.dumps({"error": "Table not found"})

            row_count = info["row_count"]
            result = {}

            for col_info in info["columns"]:
                col_name = col_info["name"]
                query = f'SELECT COUNT(*) as null_count FROM "{table_name}" WHERE "{col_name}" IS NULL'
                df = self.duckdb.query(query)
                null_count = int(df.iloc[0, 0]) if df is not None else 0
                result[col_name] = {
                    "null_count": null_count,
                    "null_percentage": round((null_count / row_count) * 100, 2) if row_count > 0 else 0,
                }

            return json.dumps({"total_rows": row_count, "columns": result}, indent=2)
        except Exception as e:
            logger.error(f"get_missing_values_summary error: {e}")
            return json.dumps({"error": str(e)})

    def compute_health_score(self, table_name: str) -> str:
        """Compute a data health score (0-100)"""
        try:
            info = self.duckdb.get_table_info(table_name)
            if not info:
                return json.dumps({"error": "Table not found"})

            row_count = info["row_count"]
            col_count = info["column_count"]
            if row_count == 0 or col_count == 0:
                return json.dumps({"overall_score": 0, "details": "Empty dataset"})

            # Completeness: % of non-null cells
            completeness_query = f"""
            SELECT
                SUM(CASE WHEN * IS NULL THEN 1 ELSE 0 END) * 1.0 / ({row_count} * {col_count}) * 100 as null_pct
            FROM "{table_name}"
            """
            try:
                df = self.duckdb.query(completeness_query)
                null_pct = float(df.iloc[0, 0]) if df is not None else 50.0
            except Exception:
                null_pct = 50.0

            completeness = max(0, 100 - null_pct)

            # Uniqueness: from duplicates
            dup_result = json.loads(self.detect_duplicates(table_name))
            dup_pct = dup_result.get("duplicate_percentage", 0)
            uniqueness = max(0, 100 - dup_pct)

            # Consistency (simplified: based on distinct ratio per column)
            consistency_scores = []
            for col_info in info["columns"]:
                stats = self.duckdb.get_statistics(table_name, col_info["name"])
                if stats and row_count > 0:
                    ratio = stats["distinct_count"] / row_count
                    # High distinct ratio is usually good (less redundancy)
                    consistency_scores.append(min(100, ratio * 100 + 50))
            consistency = sum(consistency_scores) / len(consistency_scores) if consistency_scores else 75.0

            # Validity (placeholder — assume good unless issues found)
            validity = 85.0

            overall = round(
                (completeness * 0.3 + uniqueness * 0.2 + consistency * 0.25 + validity * 0.25),
                1
            )

            result = {
                "overall_score": overall,
                "completeness": round(completeness, 1),
                "uniqueness": round(uniqueness, 1),
                "consistency": round(consistency, 1),
                "validity": round(validity, 1),
                "total_rows": row_count,
                "total_columns": col_count,
            }
            return json.dumps(result, indent=2)
        except Exception as e:
            logger.error(f"compute_health_score error: {e}")
            return json.dumps({"error": str(e)})


# Singleton
data_profiling_tools = DataProfilingTools()
