"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as api from "@/services/api";
import toast from "react-hot-toast";

export function useAutomlInspect(datasetId: string | null) {
  return useQuery({
    queryKey: ["automl", "inspect", datasetId],
    queryFn: () => api.inspectAutomlDataset(datasetId!),
    enabled: !!datasetId,
  });
}

export function useAutomlRecommendations(
  datasetId: string | null,
  target?: string | null,
  task?: string | null,
) {
  return useQuery({
    queryKey: ["automl", "models", datasetId, target ?? "", task ?? ""],
    queryFn: () => api.recommendAutomlModels(datasetId!, target ?? undefined, task ?? undefined),
    enabled: !!datasetId,
    // Small cache so switching targets is instant when revisited.
    staleTime: 5 * 60 * 1000,
  });
}

export function useTrainAutomlModel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (request: {
      dataset_id: string;
      target: string;
      task: string;
      model_id?: string;
    }) => api.trainAutomlModel(request),
    onSuccess: (data) => {
      if (data.success) {
        qc.invalidateQueries({ queryKey: ["automl"] });
        toast.success(data.message || "Model trained successfully");
      } else if (data.code === "SKLEARN_MISSING") {
        toast.error("Model training requires scikit-learn. Run `pip install scikit-learn` in the backend, then retry.");
      } else {
        toast.error(data.error || "Training failed");
      }
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to train model");
    },
  });
}
