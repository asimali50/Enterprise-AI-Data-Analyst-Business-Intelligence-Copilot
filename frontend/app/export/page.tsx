"use client";

import { Suspense, useState } from "react";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useRouter, useSearchParams } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { LoadingScreen } from "@/components/ui/loading-screen";
import { ErrorState } from "@/components/ui/error-state";
import { EmptyState } from "@/components/ui/empty-state";
import { useDatasetPreview } from "@/hooks/useAnalysis";
import { useExportResults } from "@/hooks/useExport";
import * as api from "@/services/api";
import { motion, AnimatePresence } from "framer-motion";
import {
  Download,
  Database,
  FileText,
  Image,
  FileSpreadsheet,
  FileJson,
  File,
  CheckCircle2,
  Loader2,
  Share2,
  ArrowRight,
  Globe,
  Lock,
} from "lucide-react";

interface ExportOption {
  id: string;
  label: string;
  description: string;
  icon: React.ElementType;
  format: string;
  mime: string;
}

const EXPORT_OPTIONS: ExportOption[] = [
  { id: "pdf_report", label: "PDF Report", description: "Complete analysis report as a formatted PDF document", icon: FileText, format: "PDF", mime: "application/pdf" },
  { id: "html_report", label: "HTML Report", description: "Interactive HTML report with embedded visualizations", icon: Globe, format: "HTML", mime: "text/html" },
  { id: "markdown_report", label: "Markdown Report", description: "Raw markdown of the full analysis report", icon: File, format: "MD", mime: "text/markdown" },
  { id: "csv_data", label: "CSV Data", description: "Cleaned dataset exported as CSV", icon: FileSpreadsheet, format: "CSV", mime: "text/csv" },
  { id: "excel_export", label: "Excel Export", description: "Full export including data, stats, and charts in XLSX", icon: FileSpreadsheet, format: "XLSX", mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" },
  { id: "json_export", label: "JSON Export", description: "Machine-readable JSON of all analysis results", icon: FileJson, format: "JSON", mime: "application/json" },
  { id: "charts_png", label: "Charts (PNG)", description: "All visualizations as high-resolution PNG images", icon: Image, format: "PNG", mime: "image/png" },
  { id: "charts_svg", label: "Charts (SVG)", description: "All visualizations as scalable vector graphics", icon: Image, format: "SVG", mime: "image/svg+xml" },
];

function ExportContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const datasetId = searchParams.get("dataset");

  const { data: preview, isLoading, error } = useDatasetPreview(datasetId);

  const [selectedExports, setSelectedExports] = useState<Set<string>>(new Set(["csv_data", "markdown_report"]));
  usePageTitle("Export Center");
  const [exporting, setExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState<string[]>([]);
  const [complete, setComplete] = useState(false);
  const exportMutation = useExportResults();

  const toggleExport = (id: string) => {
    setSelectedExports((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleExport = async () => {
    if (selectedExports.size === 0 || !datasetId) return;
    setExporting(true);
    setExportProgress([]);
    setComplete(false);

    try {
      const result = await exportMutation.mutateAsync({
        datasetId,
        formats: Array.from(selectedExports),
      });

      const exportedIds = result.files.map((f) => f.format);
      setExportProgress(exportedIds);

      // Actually download each servable file. Any format the backend
      // reports as unsupported is surfaced (toast) rather than silently skipped.
      const downloads: boolean[] = await Promise.all(
        result.files.map((f) =>
          api.downloadExportFile(
            f.url,
            (preview?.filename || "dataset").replace(/\.(csv|xlsx|xls)$/i, ""),
          ),
        ),
      );

      const downloaded = downloads.filter(Boolean).length;
      if (downloaded > 0) {
        setComplete(true);
      }
    } catch {
      // Error toast handled by hook
    } finally {
      setExporting(false);
    }
  };

  // ── No Dataset ──
  if (!datasetId) {
    return (
      <AppShell>
        <div className="max-w-5xl mx-auto px-6 py-10">
          <EmptyState
            icon={Download}
            title="Select a dataset"
            description="Choose a dataset to export your analysis results in multiple formats."
            action={{ label: "Go to Datasets", onClick: () => router.push("/datasets") }}
          />
        </div>
      </AppShell>
    );
  }

  if (isLoading) {
    return (
      <AppShell>
        <div className="max-w-5xl mx-auto px-6 py-10">
          <LoadingScreen message="Preparing export options..." />
        </div>
      </AppShell>
    );
  }

  if (error) {
    return (
      <AppShell>
        <div className="max-w-5xl mx-auto px-6 py-10">
          <ErrorState title="Failed to load dataset" onBack={() => router.push("/datasets")} />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="max-w-5xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold">Export Center</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {preview?.filename} &mdash; Export your analysis in your preferred format
            </p>
          </div>
          <Button size="lg" onClick={handleExport} disabled={selectedExports.size === 0 || exporting}>
            {exporting ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Exporting...</>
            ) : (
              <><Download className="mr-2 h-4 w-4" /> Export {selectedExports.size} Format{selectedExports.size !== 1 ? "s" : ""}</>
            )}
          </Button>
        </div>

        {/* Progress */}
        {exporting && (
          <Card className="mb-8 border-primary/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Exporting...</span>
                <span className="text-xs text-muted-foreground">{exportProgress.length} / {selectedExports.size}</span>
              </div>
              <Progress value={(exportProgress.length / selectedExports.size) * 100} size="sm" />
              <div className="flex flex-wrap gap-2 mt-3">
                {Array.from(selectedExports).map((id) => {
                  const opt = EXPORT_OPTIONS.find((o) => o.id === id);
                  const done = exportProgress.includes(id);
                  return (
                    <Badge key={id} variant={done ? "success" : "secondary"} className="text-[10px]">
                      {done ? "✓ " : "⟳ "}{opt?.format}
                    </Badge>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Success */}
        {complete && !exporting && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <Card className="border-emerald-500/30 bg-emerald-500/5">
              <CardContent className="p-6 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="h-6 w-6 text-emerald-500" />
                  <div>
                    <p className="text-sm font-medium">Export complete!</p>
                    <p className="text-xs text-muted-foreground">{selectedExports.size} file{selectedExports.size !== 1 ? "s" : ""} generated</p>
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={() => { setComplete(false); setSelectedExports(new Set()); }}>
                  Export More
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Export options */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {EXPORT_OPTIONS.map((option) => {
            const selected = selectedExports.has(option.id);
            const isExported = exportProgress.includes(option.id);
            const Icon = option.icon;

            return (
              <Card
                key={option.id}
                className={`cursor-pointer transition-all duration-200 ${
                  selected
                    ? "border-primary/30 shadow-sm"
                    : "hover:border-border/80"
                } ${isExported ? "border-emerald-500/20" : ""}`}
                onClick={() => !exporting && toggleExport(option.id)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                      selected ? "bg-primary/10" : "bg-muted"
                    }`}>
                      <Icon className={`h-5 w-5 ${selected ? "text-primary" : "text-muted-foreground"}`} strokeWidth={1.5} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-sm font-medium">{option.label}</p>
                        <Badge variant="secondary" className="text-[10px]">{option.format}</Badge>
                        {isExported && <CheckCircle2 className="h-4 w-4 text-emerald-500" />}
                      </div>
                      <p className="text-xs text-muted-foreground">{option.description}</p>
                    </div>
                    <Switch checked={selected} disabled={exporting} size="sm" />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Action bar */}
        <div className="flex items-center justify-between mt-8 p-4 rounded-xl bg-muted/30">
          <div className="flex items-center gap-3">
            <Download className="h-5 w-5 text-primary" strokeWidth={1.5} />
            <div>
              <p className="text-sm font-medium">{selectedExports.size} format{selectedExports.size !== 1 ? "s" : ""} selected</p>
              <p className="text-xs text-muted-foreground">Select the formats you need and click export</p>
            </div>
          </div>
          <Button onClick={handleExport} disabled={selectedExports.size === 0 || exporting}>
            {exporting ? (
              <><Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> Exporting...</>
            ) : (
              <><Download className="mr-1.5 h-4 w-4" /> Export Now</>
            )}
          </Button>
        </div>
      </div>
    </AppShell>
  );
}

export default function ExportPage() {
  return (
    <Suspense fallback={
      <AppShell>
        <div className="max-w-5xl mx-auto px-6 py-10">
          <LoadingScreen message="Loading export center..." />
        </div>
      </AppShell>
    }>
      <ExportContent />
    </Suspense>
  );
}
