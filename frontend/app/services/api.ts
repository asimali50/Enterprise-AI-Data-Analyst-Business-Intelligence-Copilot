/**
 * API Client — Enterprise AI Data Analyst
 */
import axios from "axios";
import type {
  Dataset,
  DatasetPreview,
  AnalysisStartResponse,
  FullAnalysisResponse,
  ChatRequest,
  ChatResponse,
  Report,
  AIProvidersResponse,
  AutoMLInspect,
  AutoMLRecommendation,
  TrainResult,
  AutoMLTask,
  TrainingModelInfo,
  TrainingRun,
  TrainingRunResponse,
  TrainingRunSummary,
} from "@/types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "/api/v1";

const client = axios.create({
  baseURL: API_BASE,
  timeout: 120_000,
  headers: { "Content-Type": "application/json" },
});

// ─── Datasets ───────────────────────────────────────────────

export async function listDatasets(): Promise<{ datasets: Dataset[]; count: number }> {
  const { data } = await client.get("/upload/datasets");
  return data;
}

// ─── Upload ─────────────────────────────────────────────────

export async function uploadFile(file: File): Promise<{ success: boolean; dataset_id: string; filename: string }> {
  const form = new FormData();
  form.append("file", file);
  const { data } = await client.post("/upload/file", form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}

export async function getDatasetPreview(datasetId: string): Promise<DatasetPreview> {
  const { data } = await client.get(`/upload/preview/${datasetId}`);
  return data;
}

export async function deleteDataset(datasetId: string): Promise<void> {
  await client.delete(`/upload/${datasetId}`);
}

// ─── Analysis ────────────────────────────────────────────────

export async function startAnalysis(
  datasetId: string,
  analysisTypes: string[] = ["profiling", "analytics", "visualization", "insights"],
  provider?: string,
  model?: string,
): Promise<AnalysisStartResponse> {
  const { data } = await client.post("/analyze/start", {
    dataset_id: datasetId,
    analysis_types: analysisTypes,
    ai_provider: provider,
    ai_model: model,
  });
  return data;
}

export async function getAnalysisResults(datasetId: string): Promise<FullAnalysisResponse> {
  const { data } = await client.get(`/analyze/results/${datasetId}`);
  return data;
}

// ─── Chat ────────────────────────────────────────────────────

export async function sendChatMessage(request: ChatRequest): Promise<ChatResponse> {
  const { data } = await client.post("/chat/message", request);
  return data;
}

export async function getChatHistory(datasetId: string): Promise<{ messages: { id: string; role: string; content: string; timestamp: string }[] }> {
  const { data } = await client.get(`/chat/history/${datasetId}`);
  return data;
}

// ─── Reports ─────────────────────────────────────────────────

export async function generateReport(datasetId: string): Promise<{ success: boolean; report_id: string; title: string; content: string }> {
  const { data } = await client.post(`/reports/generate/${datasetId}`);
  return data;
}

export async function listReports(datasetId: string): Promise<{ reports: Report[]; count: number }> {
  const { data } = await client.get(`/reports/list/${datasetId}`);
  return data;
}

export async function getReport(reportId: string): Promise<Report> {
  const { data } = await client.get(`/reports/${reportId}`);
  return data;
}

// ─── AI Providers ────────────────────────────────────────────

export async function getAIProviders(): Promise<AIProvidersResponse> {
  const { data } = await client.get("/models");
  return data;
}

// ─── Custom Analysis ─────────────────────────────────────────

export async function runCustomAnalysis(
  datasetId: string,
  analysisTypes: string[],
): Promise<AnalysisStartResponse> {
  return startAnalysis(datasetId, analysisTypes);
}

// ─── Cleaning ────────────────────────────────────────────────

export interface CleaningAction {
  id: string;
  type: string;
  column?: string;
  title: string;
  description: string;
  impact: "high" | "medium" | "low";
  category: string;
}

export async function getCleaningRecommendations(datasetId: string): Promise<{ recommendations: CleaningAction[] }> {
  const { data } = await client.get(`/cleaning/recommendations/${datasetId}`);
  return data;
}

export async function applyCleaningActions(
  datasetId: string,
  decisions: { action_id: string; apply: boolean }[],
): Promise<{ success: boolean; actions_applied: number }> {
  const { data } = await client.post(`/cleaning/apply/${datasetId}`, { decisions });
  return data;
}

// ─── Chart Generation ─────────────────────────────────────────

export interface ChartConfig {
  chartType: string;
  xAxis: string;
  yAxis: string;
  aggregation: string;
  colorScheme: string;
  filters: { column: string; operator: string; value: string }[];
  title: string;
}

export interface GeneratedChart {
  success: boolean;
  chart_id: string;
  data: Record<string, unknown>[];
  layout: Record<string, unknown>;
}

export async function generateChart(
  datasetId: string,
  config: ChartConfig,
): Promise<GeneratedChart> {
  const { data } = await client.post(`/visualizations/generate/${datasetId}`, config);
  return data;
}

// ─── Export ───────────────────────────────────────────────────

export interface ExportFile {
  format: string;
  type?: string;
  url: string;
}

export interface ExportResult {
  success: boolean;
  files: ExportFile[];
  unsupported_formats?: string[];
  message?: string;
}

export async function exportResults(
  datasetId: string,
  formats: string[],
): Promise<ExportResult> {
  const { data } = await client.post(`/export/${datasetId}`, { formats });
  return data;
}

/**
 * Trigger a browser download for an export URL.
 * Returns false if the download failed (network error / server 404/500).
 */
export async function downloadExportFile(url: string, fallbackName: string): Promise<boolean> {
  try {
    const { data, status } = await client.get(url, { responseType: "blob" });
    if (status < 200 || status >= 300) return false;

    const contentType = data?.type || "";
    const ext = url.split("/").pop() || "download";
    const blob = new Blob([data], { type: contentType });
    const objectUrl = window.URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = objectUrl;
    link.download = `${fallbackName}.${ext}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(objectUrl);
    return true;
  } catch {
    return false;
  }
}

// ─── Health ──────────────────────────────────────────────────

export async function healthCheck(): Promise<{ status: string; version: string }> {
  const { data } = await client.get("/health");
  return data;
}

// ─── AutoML Studio ───────────────────────────────────────────

export async function inspectAutomlDataset(datasetId: string): Promise<AutoMLInspect> {
  const { data } = await client.get(`/automl/inspect/${datasetId}`);
  return data;
}

export async function recommendAutomlModels(
  datasetId: string,
  target?: string,
  task?: string,
): Promise<AutoMLRecommendation> {
  const { data } = await client.get(`/automl/models/${datasetId}`, {
    params: { target: target || undefined, task: task || undefined },
  });
  return data;
}

export async function trainAutomlModel(request: {
  dataset_id: string;
  target: string;
  task: string;
  model_id?: string;
}): Promise<TrainResult> {
  const { data } = await client.post("/automl/train", request);
  return data;
}

// ─── Model Training (multi-model pipeline) ─────────────────────

export async function listTrainingModels(
  task?: string,
): Promise<{
  task?: string;
  classification?: TrainingModelInfo[];
  regression?: TrainingModelInfo[];
  models?: TrainingModelInfo[];
}> {
  const { data } = await client.get("/training/models", {
    params: { task: task || undefined },
  });
  return data;
}

export async function runTrainingPipeline(request: {
  dataset_id: string;
  target?: string;
  task?: string;
  models?: string[];
}): Promise<TrainingRunResponse> {
  const { data } = await client.post("/training/run", request);
  return data;
}

export async function listTrainingRuns(
  datasetId: string,
): Promise<{ dataset_id: string; runs: TrainingRunSummary[] }> {
  const { data } = await client.get(`/training/runs/${datasetId}`);
  return data;
}

export async function getTrainingRun(
  datasetId: string,
  runId: string,
): Promise<TrainingRun> {
  const { data } = await client.get(`/training/runs/${datasetId}/${runId}`);
  return data;
}
