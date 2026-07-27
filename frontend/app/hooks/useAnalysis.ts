"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as api from "@/services/api";
import toast from "react-hot-toast";

export function useUploadDataset() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => api.uploadFile(file),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["datasets"] });
      toast.success(`Uploaded ${data.filename} successfully`);
    },
    onError: (err: Error) => {
      toast.error(err.message || "Upload failed");
    },
  });
}

export function useDatasetPreview(datasetId: string | null) {
  return useQuery({
    queryKey: ["preview", datasetId],
    queryFn: () => api.getDatasetPreview(datasetId!),
    enabled: !!datasetId,
  });
}

export function useStartAnalysis() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ datasetId, types }: { datasetId: string; types?: string[] }) =>
      api.startAnalysis(datasetId, types),
    onSuccess: (data) => {
      toast.success("Analysis started — this may take a moment");
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to start analysis");
    },
  });
}

export function useAnalysisResults(datasetId: string | null) {
  return useQuery({
    queryKey: ["analysis", datasetId],
    queryFn: () => api.getAnalysisResults(datasetId!),
    enabled: !!datasetId,
    refetchInterval: (query) => {
      const data = query.state.data;
      if (data?.status === "completed" || data?.status === "failed") return false;
      return 3000;
    },
  });
}

export function useDeleteDataset() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (datasetId: string) => api.deleteDataset(datasetId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["datasets"] });
      toast.success("Dataset deleted");
    },
  });
}
