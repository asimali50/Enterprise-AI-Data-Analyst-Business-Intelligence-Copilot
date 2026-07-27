"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as api from "@/services/api";
import toast from "react-hot-toast";

export function useGenerateReport(datasetId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.generateReport(datasetId!),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["reports", datasetId] });
      toast.success("Report generated successfully");
    },
    onError: (err: Error) => {
      toast.error(err.message || "Report generation failed");
    },
  });
}

export function useReportList(datasetId: string | null) {
  return useQuery({
    queryKey: ["reports", datasetId],
    queryFn: () => api.listReports(datasetId!),
    enabled: !!datasetId,
  });
}

export function useReport(reportId: string | null) {
  return useQuery({
    queryKey: ["report", reportId],
    queryFn: () => api.getReport(reportId!),
    enabled: !!reportId,
  });
}
