"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as api from "@/services/api";
import toast from "react-hot-toast";

export function useTrainingModels(task: string | null) {
  return useQuery({
    queryKey: ["training", "models", task ?? ""],
    queryFn: () => api.listTrainingModels(task ?? undefined),
    enabled: !!task,
    staleTime: 5 * 60 * 1000,
  });
}

export function useRunTrainingPipeline() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (request: {
      dataset_id: string;
      target?: string;
      task?: string;
      models?: string[];
    }) => api.runTrainingPipeline(request),
    onSuccess: (data) => {
      if (data.success) {
        qc.invalidateQueries({ queryKey: ["training", "runs"] });
        toast.success(
          data.best_model_name
            ? `Training complete — best model: ${data.best_model_name}`
            : "Training complete",
        );
      } else if (data.code === "SKLEARN_MISSING") {
        toast.error(
          "scikit-learn is not installed. Run `pip install scikit-learn` in the backend, then retry.",
        );
      } else {
        toast.error(data.error || "Training failed");
      }
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to run training");
    },
  });
}

export function useTrainingRuns(datasetId: string | null) {
  return useQuery({
    queryKey: ["training", "runs", datasetId],
    queryFn: () => api.listTrainingRuns(datasetId!),
    enabled: !!datasetId,
  });
}

export function useTrainingRun(datasetId: string | null, runId: string | null) {
  return useQuery({
    queryKey: ["training", "runs", datasetId, runId],
    queryFn: () => api.getTrainingRun(datasetId!, runId!),
    enabled: !!datasetId && !!runId,
  });
}
