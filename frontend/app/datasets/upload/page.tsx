"use client";

import { useCallback, useState } from "react";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useUploadDataset } from "@/hooks/useAnalysis";
import { useDropzone } from "react-dropzone";
import {
  Upload,
  File,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  X,
  ArrowRight,
  Database,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const ACCEPTED_TYPES = {
  "text/csv": [".csv"],
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
  "application/vnd.ms-excel": [".xls"],
};

const MAX_SIZE = 100 * 1024 * 1024; // 100 MB

export default function UploadDatasetPage() {
  const router = useRouter();
  usePageTitle("Upload Dataset");
  const uploadMutation = useUploadDataset();
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successId, setSuccessId] = useState<string | null>(null);

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      const f = acceptedFiles[0];
      if (!f) return;
      setError(null);
      setFile(f);
    },
    [],
  );

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    accept: ACCEPTED_TYPES,
    maxFiles: 1,
    maxSize: MAX_SIZE,
    onDropRejected: (rejections) => {
      const rejection = rejections[0];
      if (rejection?.errors[0]?.code === "file-too-large") {
        setError("File exceeds the 100 MB size limit.");
      } else if (rejection?.errors[0]?.code === "file-invalid-type") {
        setError("Invalid file type. Please use CSV, XLSX, or XLS files.");
      } else {
        setError("File could not be uploaded. Please try again.");
      }
    },
  });

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const result = await uploadMutation.mutateAsync(file);
      setSuccessId(result.dataset_id);
      setTimeout(() => {
        router.push(`/datasets/${result.dataset_id}`);
      }, 1500);
    } catch (err: any) {
      setError(err?.message || "Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const resetFile = () => {
    setFile(null);
    setError(null);
  };

  return (
    <AppShell>
      <div className="max-w-3xl mx-auto px-6 py-10">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold">Upload Dataset</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Upload your data file to begin the analysis workflow. Supported formats: CSV, XLSX, XLS.
          </p>
        </div>

        {/* Upload Area */}
        {!successId && (
          <Card
            className={`border-dashed border-2 transition-all ${
              isDragActive && !isDragReject
                ? "border-primary bg-primary/5"
                : isDragReject
                ? "border-destructive bg-destructive/5"
                : file
                ? "border-primary/30"
                : "border-border hover:border-primary/30"
            }`}
          >
            <CardContent className="p-10">
              {!file ? (
                <div {...getRootProps()} className="flex flex-col items-center justify-center gap-4 text-center cursor-pointer">
                  <input {...getInputProps()} />
                  <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10">
                    <Upload className="h-10 w-10 text-primary" strokeWidth={1.5} />
                  </div>
                  {isDragActive ? (
                    <div>
                      <p className="text-lg font-medium text-primary">Drop your file here...</p>
                      <p className="text-sm text-muted-foreground mt-1">Release to upload</p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-lg font-medium">Drag & drop your data file here</p>
                      <p className="text-sm text-muted-foreground mt-1">or click to browse</p>
                    </div>
                  )}
                  <div className="flex items-center gap-4 text-xs text-muted-foreground mt-2">
                    <span className="flex items-center gap-1"><FileSpreadsheet className="h-3.5 w-3.5" /> CSV</span>
                    <span className="flex items-center gap-1"><FileSpreadsheet className="h-3.5 w-3.5" /> XLSX</span>
                    <span className="flex items-center gap-1"><FileSpreadsheet className="h-3.5 w-3.5" /> XLS</span>
                    <Badge variant="secondary" className="text-[10px]">Up to 100 MB</Badge>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Selected file */}
                  <div className="flex items-center justify-between p-4 rounded-xl bg-muted/30">
                    <div className="flex items-center gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                        <File className="h-6 w-6 text-primary" strokeWidth={1.5} />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{file.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {(file.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={resetFile}
                      disabled={uploading}
                      className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-muted transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Error */}
                  <AnimatePresence>
                    {error && (
                      <motion.div
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="flex items-center gap-2 rounded-lg bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive"
                      >
                        <AlertCircle className="h-4 w-4 shrink-0" />
                        {error}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Action buttons */}
                  <div className="flex items-center gap-3 justify-end">
                    <Button variant="outline" onClick={resetFile} disabled={uploading}>
                      Choose Different File
                    </Button>
                    <Button onClick={handleUpload} disabled={uploading} size="lg">
                      {uploading ? (
                        <span className="flex items-center gap-2">
                          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                          </svg>
                          Uploading...
                        </span>
                      ) : (
                        <span className="flex items-center gap-2">
                          Upload Dataset <ArrowRight className="h-4 w-4" />
                        </span>
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Success state */}
        <AnimatePresence>
          {successId && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
            >
              <Card className="border-emerald-500/30 bg-emerald-500/5">
                <CardContent className="p-10 text-center">
                  <div className="flex flex-col items-center gap-4">
                    <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-emerald-500/10">
                      <CheckCircle2 className="h-10 w-10 text-emerald-500" strokeWidth={1.5} />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold mb-1">Upload Successful!</h3>
                      <p className="text-sm text-muted-foreground">
                        Your dataset has been uploaded. Redirecting to dataset overview...
                      </p>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Redirecting...
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Guidelines */}
        {!successId && (
          <Card className="mt-6">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Upload Guidelines</CardTitle>
              <CardDescription className="text-xs">
                Follow these guidelines for the best analysis results
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {[
                "Ensure the first row of your file contains column headers",
                "Remove any merged cells or formatting before uploading",
                "Maximum file size is 100 MB",
                "Supported formats: CSV, XLSX, XLS",
                "Columns with mixed data types may be inferred as text",
                "Deduplicate rows before uploading for cleaner results",
              ].map((item) => (
                <div key={item} className="flex items-start gap-3">
                  <CheckCircle2 className="h-4 w-4 text-muted-foreground/40 shrink-0 mt-0.5" />
                  <span className="text-muted-foreground">{item}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </AppShell>
  );
}
