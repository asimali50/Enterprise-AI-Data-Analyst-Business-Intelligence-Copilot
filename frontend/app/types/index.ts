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

// ─── AutoML Studio ───────────────────────────────────────────

export type AutoMLTask = "regression" | "classification" | "clustering" | "time_series";
export type ColumnRole = "numeric" | "boolean" | "categorical" | "datetime" | "text" | "id";

export interface AutoMLColumn {
  name: string;
  dtype: string;
  role: ColumnRole;
  missing: number;
  missing_pct: number;
  distinct: number;
  distinct_true?: number;
  missing_true?: number;
  unique_ratio: number;
  cardinality: "low" | "medium" | "high";
  stats?: {
    mean?: number | null;
    median?: number | null;
    min?: number | null;
    max?: number | null;
    std?: number | null;
  };
}

export interface DetectedTask {
  task: AutoMLTask;
  confidence: number;
  target?: string | null;
  time_column?: string | null;
  reason: string;
}

export interface CandidateTarget {
  column: string;
  role: ColumnRole;
  suitability: number;
  task: AutoMLTask;
  reason: string;
  missing_pct: number;
  distinct: number;
}

export interface DataQuality {
  total_missing: number;
  missing_columns: number;
  health_score: number;
  notes: string[];
}

export interface AutoMLInspect {
  dataset_id: string;
  filename: string;
  shape: { rows: number; columns: number };
  columns: AutoMLColumn[];
  detected_tasks: DetectedTask[];
  candidate_targets: CandidateTarget[];
  data_quality: DataQuality;
  recommendation: {
    task?: AutoMLTask | null;
    target?: string | null;
    time_column?: string | null;
    message?: string;
  };
  summary: string;
}

export interface CapabilityBreakdown {
  label: string;
  score: number;
  weight: number;
}

export interface AutoMLModel {
  id: string;
  name: string;
  family: string;
  tier: "recommended" | "specialist" | "baseline" | "alternative";
  trainable: boolean;
  score: number;
  rank: number;
  tags: string[];
  metrics: string[];
  best_for: string;
  tradeoffs: string;
  requires?: string;
  rationale: string;
  why: string[];
  capability_breakdown: Record<string, CapabilityBreakdown>;
}

export interface PerformanceEstimate {
  quality: string;
  band: [number, number];
  score: number;
  factors: string[];
  disclaimer: string;
}

export interface AutoMLRecommendation {
  dataset_id: string;
  filename: string;
  task: AutoMLTask;
  target?: string | null;
  time_column?: string | null;
  n_rows: number;
  n_features: number;
  profile: Record<string, number>;
  recommended_model?: string | null;
  performance_estimate: PerformanceEstimate;
  models: AutoMLModel[];
  baseline: { id?: string | null; name?: string | null; score?: number | null };
  why_top?: string | null;
}

export interface TrainResult {
  success: boolean;
  error?: string;
  code?: string;
  dataset_id?: string;
  target?: string;
  task?: string;
  model_id?: string;
  model_name?: string;
  metrics?: Record<string, number>;
  scoring?: string;
  n_train?: number;
  n_test?: number;
  features_used?: number;
  message?: string;
}

// ─── Model Training (multi-model pipeline) ─────────────────────

export type TrainingMetric =
  | "accuracy"
  | "precision"
  | "recall"
  | "f1"
  | "roc_auc"
  | "r2"
  | "rmse"
  | "mae"
  | "mape";

export interface TrainingModelInfo {
  id: string;
  name: string;
  task: "classification" | "regression";
  available: boolean;
  reason?: string | null;
}

export interface TrainingModelResult {
  id: string;
  name: string;
  status: "trained" | "skipped";
  metrics: Record<string, number | null>;
  training_time_s: number;
  prediction_time_s: number;
  memory_mb?: number | null;
  error?: string;
}

export interface TrainingRunSummary {
  run_id: string;
  dataset_id: string;
  task: string;
  target?: string | null;
  best_model?: string | null;
  primary_metric?: string | null;
  n_rows: number;
  n_features: number;
  created_at?: string | null;
}

export interface TrainingRun {
  run_id: string;
  dataset_id: string;
  task: string;
  target?: string | null;
  best_model?: string | null;
  primary_metric?: string | null;
  n_rows: number;
  n_features: number;
  created_at?: string | null;
  models: TrainingModelResult[];
  skipped: TrainingModelResult[];
  config?: Record<string, unknown>;
}

export interface TrainingRunResponse {
  success: boolean;
  error?: string;
  code?: string;
  run_id?: string;
  dataset_id?: string;
  filename?: string;
  task?: string;
  target?: string | null;
  n_rows?: number;
  n_features?: number;
  primary_metric?: string;
  best_model?: string;
  best_model_name?: string;
  best_score?: number | null;
  models?: TrainingModelResult[];
  skipped?: TrainingModelResult[];
}
