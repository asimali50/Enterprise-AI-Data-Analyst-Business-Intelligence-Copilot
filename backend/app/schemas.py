"""
Pydantic Schemas for API Requests/Responses
Enterprise AI Data Analyst - Data Validation Schemas
"""
from typing import Any, Dict, List, Optional
from datetime import datetime
from pydantic import BaseModel, Field


# ============== File Upload Schemas ==============

class FileUploadRequest(BaseModel):
    """File upload request"""
    filename: str = Field(..., min_length=1, max_length=255)
    file_size_bytes: int = Field(..., gt=0)


class ColumnInfo(BaseModel):
    """Column metadata"""
    name: str
    dtype: str
    non_null_count: int
    null_count: int
    null_percentage: float


class DatasetPreview(BaseModel):
    """Dataset preview response"""
    dataset_id: str
    filename: str
    num_rows: int
    num_columns: int
    columns: List[ColumnInfo]
    preview_data: List[Dict[str, Any]]
    file_size_mb: float
    upload_date: datetime


# ============== Analysis Schemas ==============

class DataHealthScore(BaseModel):
    """Data quality health score"""
    overall_score: float = Field(..., ge=0, le=100)
    completeness: float
    consistency: float
    validity: float
    accuracy: float
    details: Dict[str, Any]


class ColumnStatistics(BaseModel):
    """Statistics for a single column"""
    column_name: str
    dtype: str
    count: int
    null_count: int
    distinct_count: int

    # For numeric columns
    mean: Optional[float] = None
    median: Optional[float] = None
    std_dev: Optional[float] = None
    min_value: Optional[float] = None
    max_value: Optional[float] = None

    # For string columns
    max_length: Optional[int] = None
    min_length: Optional[int] = None


class DataProfilingResult(BaseModel):
    """Data profiling agent output"""
    dataset_id: str
    health_score: DataHealthScore
    column_statistics: List[ColumnStatistics]
    missing_values_analysis: Dict[str, Any]
    duplicate_rows_count: int
    outliers_detected: Dict[str, List[Any]]
    recommendations: List[str]


class KPI(BaseModel):
    """Key Performance Indicator"""
    name: str
    value: float
    unit: str
    trend: str  # up, down, stable
    trend_percentage: float


class AnalyticsResult(BaseModel):
    """Analytics agent output"""
    dataset_id: str
    kpis: List[KPI]
    summary_statistics: Dict[str, Any]
    correlations: Dict[str, float]
    trends: List[Dict[str, Any]]
    segments: List[Dict[str, Any]]
    anomalies: List[Dict[str, Any]]
    forecasts: Optional[List[Dict[str, Any]]] = None


# ============== Visualization Schemas ==============

class ChartSpec(BaseModel):
    """Plotly chart specification"""
    chart_id: str
    chart_type: str
    title: str
    data: List[Dict[str, Any]]
    layout: Dict[str, Any]
    config: Dict[str, Any]


class VisualizationResult(BaseModel):
    """Visualization agent output"""
    dataset_id: str
    charts: List[ChartSpec]
    summary: str


# ============== Business Insights Schemas ==============

class BusinessInsight(BaseModel):
    """Single business insight"""
    title: str
    description: str
    impact: str  # high, medium, low
    type: str  # opportunity, risk, finding


class ActionItem(BaseModel):
    """Actionable recommendation"""
    priority: str  # high, medium, low
    action: str
    expected_outcome: str
    timeline: str


class BusinessInsightsResult(BaseModel):
    """Business insights agent output"""
    dataset_id: str
    executive_summary: str
    key_findings: List[BusinessInsight]
    opportunities: List[str]
    risks: List[str]
    recommendations: List[str]
    action_items: List[ActionItem]


# ============== Chat Schemas ==============

class ChatMessage(BaseModel):
    """Chat message"""
    role: str  # user, assistant
    content: str
    timestamp: datetime


class ChatRequest(BaseModel):
    """Chat request"""
    dataset_id: str
    message: str
    conversation_history: Optional[List[ChatMessage]] = None


class ChatResponse(BaseModel):
    """Chat response"""
    dataset_id: str
    message: str
    streaming: bool = False
    sources: Optional[List[str]] = None


# ============== Report Schemas ==============

class ReportSection(BaseModel):
    """Report section"""
    title: str
    content: str
    charts: Optional[List[str]] = None


class Report(BaseModel):
    """Generated report"""
    report_id: str
    dataset_id: str
    title: str
    sections: List[ReportSection]
    generated_at: datetime
    generated_by: str


# ============== AI Configuration Schemas ==============

class AIProviderConfig(BaseModel):
    """AI provider configuration"""
    provider: str
    model: str
    temperature: float = Field(..., ge=0, le=2)
    max_tokens: int = Field(..., gt=0)
    api_key: Optional[str] = None


class AIProvidersList(BaseModel):
    """Available AI providers"""
    providers: List[Dict[str, Any]]
    current_provider: str
    current_model: str


# ============== Analysis Request/Response ==============

class AnalyzeRequest(BaseModel):
    """Full analysis request"""
    dataset_id: str
    analysis_types: List[str] = Field(
        default=["profiling", "analytics", "visualization", "insights"],
        description="Types of analysis to perform"
    )
    ai_provider: Optional[str] = None
    ai_model: Optional[str] = None


class AnalyzeResponse(BaseModel):
    """Full analysis response"""
    dataset_id: str
    profiling: Optional[DataProfilingResult] = None
    analytics: Optional[AnalyticsResult] = None
    visualizations: Optional[VisualizationResult] = None
    insights: Optional[BusinessInsightsResult] = None
    processing_time_seconds: float


# ============== Error Response ==============

class ErrorResponse(BaseModel):
    """Error response"""
    error: str
    detail: Optional[str] = None
    status_code: int
