/**
 * API Client — Enterprise AI Data Analyst
 */
import axios from "axios";
import type {
  DatasetPreview,
  AnalysisStartResponse,
  FullAnalysisResponse,
  ChatRequest,
  ChatResponse,
  Report,
  AIProvidersResponse,
} from "@/types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "/api/v1";

const client = axios.create({
  baseURL: API_BASE,
  timeout: 120_000,
  headers: { "Content-Type": "application/json" },
});

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

// ─── Health ──────────────────────────────────────────────────

export async function healthCheck(): Promise<{ status: string; version: string }> {
  const { data } = await client.get("/health");
  return data;
}
