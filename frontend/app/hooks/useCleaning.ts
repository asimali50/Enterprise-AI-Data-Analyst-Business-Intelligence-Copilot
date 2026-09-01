"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as api from "@/services/api";
import toast from "react-hot-toast";

export function useCleaningRecommendations(datasetId: string | null) {
  return useQuery({
    queryKey: ["cleaning", datasetId],
    queryFn: () => api.getCleaningRecommendations(datasetId!),
    enabled: !!datasetId,
  });
}

export function useApplyCleaning() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      datasetId,
      decisions,
    }: {
      datasetId: string;
      decisions: { action_id: string; apply: boolean }[];
    }) => api.applyCleaningActions(datasetId, decisions),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["cleaning"] });
      toast.success(`${data.actions_applied} cleaning actions applied`);
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to apply cleaning actions");
    },
  });
}
