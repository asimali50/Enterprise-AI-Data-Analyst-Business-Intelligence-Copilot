"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import * as api from "@/services/api";
import toast from "react-hot-toast";
import type { ChartConfig } from "@/services/api";

export function useGenerateChart() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      datasetId,
      config,
    }: {
      datasetId: string;
      config: ChartConfig;
    }) => api.generateChart(datasetId, config),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["charts"] });
      toast.success("Chart generated successfully");
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to generate chart");
    },
  });
}
