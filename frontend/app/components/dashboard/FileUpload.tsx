"use client";

import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useUploadDataset } from "@/hooks/useAnalysis";

interface FileUploadProps {
  onUploaded: (datasetId: string) => void;
}

export function FileUpload({ onUploaded }: FileUploadProps) {
  const [uploading, setUploading] = useState(false);
  const uploadMutation = useUploadDataset();

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (!file) return;
      setUploading(true);
      try {
        const result = await uploadMutation.mutateAsync(file);
        onUploaded(result.dataset_id);
      } finally {
        setUploading(false);
      }
    },
    [uploadMutation, onUploaded],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "text/csv": [".csv"], "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"], "application/vnd.ms-excel": [".xls"] },
    maxFiles: 1,
    maxSize: 100 * 1024 * 1024,
  });

  return (
    <Card className="border-dashed border-2 hover:border-primary/50 transition-colors cursor-pointer">
      <CardContent className="p-8">
        <div
          {...getRootProps()}
          className="flex flex-col items-center justify-center gap-4 text-center"
        >
          <input {...getInputProps()} />
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <svg className="h-8 w-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
            </svg>
          </div>
          {isDragActive ? (
            <p className="text-lg font-medium text-primary">Drop your file here...</p>
          ) : (
            <>
              <p className="text-lg font-medium">Drag & drop your data file</p>
              <p className="text-sm text-muted-foreground">or click to browse</p>
              <p className="text-xs text-muted-foreground">Supports CSV, XLSX, XLS — up to 100MB</p>
            </>
          )}
          {uploading && (
            <div className="flex items-center gap-2 text-sm text-primary mt-2">
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Uploading...
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
