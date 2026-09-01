"use client";

import { useMutation } from "@tanstack/react-query";
import * as api from "@/services/api";
import toast from "react-hot-toast";

export function useExportResults() {
  return useMutation({
    mutationFn: ({
      datasetId,
      formats,
    }: {
      datasetId: string;
      formats: string[];
    }) => api.exportResults(datasetId, formats),
    onSuccess: (data) => {
      if (data.success) {
        toast.success(`Export complete: ${data.files.length} file(s) generated`);
      } else if (data.unsupported_formats?.length) {
        toast.error(
          `Unavailable: ${data.unsupported_formats.join(", ")}. Supported: CSV, JSON, Markdown.`,
        );
      }
    },
    onError: (err: Error) => {
      toast.error(err.message || "Export failed");
    },
  });
}
