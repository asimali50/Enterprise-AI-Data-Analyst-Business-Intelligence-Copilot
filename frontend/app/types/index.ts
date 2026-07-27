// ─── Dataset Types ────────────────────────────────────────────

export interface ColumnInfo {
  name: string;
  dtype: string;
  non_null_count: number;
  null_count: number;
  null_percentage: number;
}

export interface DatasetPreview {
  dataset_id: string;
  filename: string;
  num_rows: number;
  num_columns: number;
  columns: ColumnInfo[];
  preview_data: Record<string, unknown>[];
  file_size_mb: number;
  upload_date: string;
}

export interface Dataset {
  id: string;
  filename: string;
  num_rows: number;
  num_columns: number;
  file_size_mb: number;
  health_score: number;
  analysis_status: "pending" | "processing" | "completed" | "failed";
  upload_date: string;
}

// ─── Analysis Types ───────────────────────────────────────────

export interface DataHealthScore {
  overall_score: number;
  completeness: number;
  uniqueness?: number;
  consistency: number;
  validity: number;
}

export interface ColumnStatistics {
  column_name: string;
  dtype: string;
  count: number;
  null_count: number;
  distinct_count: number;
  mean?: number;
  median?: number;
  std_dev?: number;
  min_value?: number;
  max_value?: number;
}

export interface KPI {
  name: string;
  value: number;
  unit: string;
  trend: "up" | "down" | "stable";
  trend_percentage?: number;
}

export interface BusinessInsight {
  title: string;
  description: string;
  impact: "high" | "medium" | "low";
  type: "opportunity" | "risk" | "finding";
}

export interface ActionItem {
  priority: "high" | "medium" | "low";
  action: string;
  expected_outcome: string;
  timeline: string;
}

export interface AnalysisResult {
  analysis_id: string;
  dataset_id: string;
  analysis_type: string;
  result_data: Record<string, unknown>;
  processing_time_seconds: number;
  created_at?: string;
}

export interface FullAnalysisResponse {
  dataset_id: string;
  status: string;
  health_score: number;
  results: AnalysisResult[];
}

// ─── Chart Types ──────────────────────────────────────────────

export interface ChartSpec {
  chart_id: string;
  chart_type: string;
  title: string;
  data: Record<string, unknown>[];
  layout: Record<string, unknown>;
  config: Record<string, unknown>;
}

// ─── Chat Types ───────────────────────────────────────────────

export interface ChatMessage {
  id?: string;
  role: "user" | "assistant";
  content: string;
  timestamp?: string;
}

export interface ChatRequest {
  dataset_id: string;
  message: string;
  conversation_history?: ChatMessage[];
}

export interface ChatResponse {
  dataset_id: string;
  message: string;
  streaming: boolean;
  sources?: string[];
}

// ─── Report Types ─────────────────────────────────────────────

export interface Report {
  id: string;
  title: string;
  report_type: string;
  created_at: string;
  content_length?: number;
  content?: string;
}

// ─── API Types ────────────────────────────────────────────────

export interface AIProvider {
  name: string;
  id: string;
  models: { id: string; name: string }[];
}

export interface AIProvidersResponse {
  providers: AIProvider[];
  default_provider: string;
  default_model: string;
}

export interface AnalysisStartResponse {
  success: boolean;
  analysis_id: string;
  dataset_id: string;
  status: string;
  message: string;
}

export interface ErrorResponse {
  error: string;
  detail?: string;
  status_code: number;
}
