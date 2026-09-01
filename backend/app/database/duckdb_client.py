"""
DuckDB Client
Enterprise AI Data Analyst - Analytics Database Layer
"""
import os
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple
import duckdb
import pandas as pd
from app.config import get_settings
from app.utils.logger import logger


class DuckDBClient:
    """DuckDB wrapper for analytics queries"""

    def __init__(self):
        self.settings = get_settings()
        self.db_path = self.settings.DUCKDB_PATH

        # Create data directory
        Path(self.db_path).parent.mkdir(exist_ok=True)

        self.conn: Optional[duckdb.DuckDBPyConnection] = None
        self._connect()

    def _connect(self) -> None:
        """Establish DuckDB connection"""
        try:
            self.conn = duckdb.connect(self.db_path)
            logger.info("DuckDB connected successfully")
        except Exception as e:
            logger.error(f"DuckDB connection error: {e}")
            raise

    def register_dataframe(self, df: pd.DataFrame, table_name: str) -> bool:
        """Persist a pandas DataFrame as a DuckDB table.

        A plain ``conn.register()`` only creates a connection-scoped in-memory
        view, which silently disappears on process restart. Production
        deployments (Vercel serverless, restarts) must survive that, so the
        DataFrame is materialized into the on-disk database instead.
        """
        try:
            self.conn.execute(
                f'CREATE OR REPLACE TABLE "{table_name}" AS SELECT * FROM df'
            )
            logger.info(f"DataFrame persisted as table: {table_name}")
            return True
        except Exception as e:
            logger.error(f"Error registering DataFrame: {e}")
            return False

    def query(self, sql: str, params: Optional[List[Any]] = None) -> Optional[pd.DataFrame]:
        """Execute query and return results as DataFrame"""
        try:
            if params:
                result = self.conn.execute(sql, params).fetchall()
                columns = [desc[0] for desc in self.conn.description]
                return pd.DataFrame(result, columns=columns)
            else:
                return self.conn.execute(sql).df()
        except Exception as e:
            logger.error(f"Query execution error: {e}")
            return None

    def get_table_info(self, table_name: str) -> Optional[Dict[str, Any]]:
        """Get table schema and row count"""
        try:
            # Get schema
            schema_result = self.conn.execute(f"DESCRIBE {table_name}").fetchall()
            columns = [{"name": row[0], "type": row[1]} for row in schema_result]

            # Get row count
            count_result = self.conn.execute(f"SELECT COUNT(*) FROM {table_name}").fetchall()
            row_count = count_result[0][0] if count_result else 0

            return {
                "table_name": table_name,
                "columns": columns,
                "row_count": row_count,
                "column_count": len(columns)
            }
        except Exception as e:
            logger.error(f"Error getting table info: {e}")
            return None

    def get_statistics(self, table_name: str, column_name: str) -> Optional[Dict[str, Any]]:
        """Get basic statistics for a column"""
        try:
            stats_query = f"""
            SELECT
                COUNT(*) as count,
                COUNT(DISTINCT {column_name}) as distinct_count,
                CAST(SUM(CASE WHEN {column_name} IS NULL THEN 1 ELSE 0 END) AS FLOAT) / COUNT(*) * 100 as null_percentage
            FROM {table_name}
            """
            result = self.conn.execute(stats_query).fetchall()

            if result:
                row = result[0]
                return {
                    "count": row[0],
                    "distinct_count": row[1],
                    "null_percentage": row[2]
                }
            return None
        except Exception as e:
            logger.error(f"Error calculating statistics: {e}")
            return None

    def close(self) -> None:
        """Close database connection"""
        if self.conn:
            self.conn.close()
            logger.info("DuckDB connection closed")


# Global instance
duckdb_client: Optional[DuckDBClient] = None


def get_duckdb() -> DuckDBClient:
    """Get or create DuckDB client"""
    global duckdb_client
    if duckdb_client is None:
        duckdb_client = DuckDBClient()
    return duckdb_client
