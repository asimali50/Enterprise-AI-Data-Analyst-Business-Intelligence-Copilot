"use client";

import { useState, Suspense } from "react";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useRouter, useParams } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs } from "@/components/ui/tabs";
import { LoadingScreen } from "@/components/ui/loading-screen";
import { ErrorState } from "@/components/ui/error-state";
import { HealthScoreCard } from "@/components/dashboard/HealthScoreCard";
import { DataTable } from "@/components/dashboard/DataTable";
import { ColumnStats } from "@/components/dashboard/ColumnStats";
import { useDatasetPreview, useAnalysisResults, useStartAnalysis } from "@/hooks/useAnalysis";
import {
  Database,
  ArrowLeft,
  Activity,
  RefreshCw,
  Table,
  HardDrive,
  Calendar,
  BarChart3,
  FileSearch,
  Sparkles,
  Lightbulb,
  MessageSquareText,
  FileText,
  Trash2,
  ChevronRight,
  Cpu,
  TrainFront,
} from "lucide-react";
import { formatDate } from "@/utils/cn";
import { Dialog } from "@/components/ui/dialog";

function DatasetDetailContent() {
  const router = useRouter();
  const params = useParams();
  const datasetId = params.id as string;

  const { data: preview, isLoading, error, refetch } = useDatasetPreview(datasetId);
  const { data: results } = useAnalysisResults(datasetId);
  const startAnalysis = useStartAnalysis();
  const [activeTab, setActiveTab] = useState("overview");
  usePageTitle("Dataset Overview");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  if (isLoading) {
    return (
      <AppShell>
        <div className="max-w-7xl mx-auto px-6 py-10">
          <LoadingScreen message="Loading dataset details..." />
        </div>
      </AppShell>
    );
  }

  if (error || !preview) {
    return (
      <AppShell>
        <div className="max-w-4xl mx-auto px-6 py-10">
          <ErrorState
            title="Dataset not found"
            message="This dataset could not be loaded. It may have been deleted or the server may be unavailable."
            onRetry={() => refetch()}
            onBack={() => router.push("/datasets")}
          />
        </div>
      </AppShell>
    );
  }

  const profiling = results?.results?.find((r) => r.analysis_type === "profiling")?.result_data as Record<string, unknown> | undefined;
  const healthScore = (profiling?.health_score as Record<string, unknown>) || {};

  const tabs = [
    { id: "overview", label: "Overview" },
    { id: "preview", label: "Data Preview" },
    { id: "columns", label: "Columns" },
    { id: "actions", label: "Actions" },
  ];

  return (
    <AppShell>
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Back button */}
        <button
          onClick={() => router.push("/datasets")}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Datasets
        </button>

        {/* ── Header ── */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-8">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary/10">
              <Database className="h-7 w-7 text-primary" strokeWidth={1.5} />
            </div>
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-2xl font-bold">{preview.filename}</h1>
                <Badge
                  variant={results?.status === "completed" ? "success" : results?.status === "processing" ? "warning" : "secondary"}
                >
                  {results?.status || "pending"}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                Dataset ID: {preview.dataset_id}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={() => router.push(`/cleaning?dataset=${datasetId}`)}>
              <Sparkles className="mr-1.5 h-4 w-4" />
              Clean Data
            </Button>
            <Button
              size="sm"
              onClick={() => startAnalysis.mutate({ datasetId })}
              disabled={startAnalysis.isPending}
            >
              {startAnalysis.isPending ? (
                <>
                  <RefreshCw className="mr-1.5 h-4 w-4 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Activity className="mr-1.5 h-4 w-4" />
                  {results?.status === "completed" ? "Re-analyze" : "Run Analysis"}
                </>
              )}
            </Button>
          </div>
        </div>

        {/* ── Metadata Cards ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Table className="h-5 w-5 text-primary" strokeWidth={1.5} />
              </div>
              <div>
                <p className="text-lg font-semibold">{preview.num_rows.toLocaleString()}</p>
                <p className="text-[10px] text-muted-foreground">Total Rows</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <BarChart3 className="h-5 w-5 text-primary" strokeWidth={1.5} />
              </div>
              <div>
                <p className="text-lg font-semibold">{preview.num_columns}</p>
                <p className="text-[10px] text-muted-foreground">Columns</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <HardDrive className="h-5 w-5 text-primary" strokeWidth={1.5} />
              </div>
              <div>
                <p className="text-lg font-semibold">{preview.file_size_mb.toFixed(2)} MB</p>
                <p className="text-[10px] text-muted-foreground">File Size</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Calendar className="h-5 w-5 text-primary" strokeWidth={1.5} />
              </div>
              <div>
                <p className="text-lg font-semibold">{formatDate(preview.upload_date)}</p>
                <p className="text-[10px] text-muted-foreground">Uploaded</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ── Tabs ── */}
        <Tabs tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} variant="underline" className="mb-6" />

        {/* Tab: Overview */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            {healthScore.overall_score !== undefined && (
              <HealthScoreCard
                score={healthScore.overall_score as number}
                completeness={healthScore.completeness as number}
                consistency={healthScore.consistency as number}
                validity={healthScore.validity as number}
              />
            )}

            {!healthScore.overall_score && (
              <Card>
                <CardContent className="p-8 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
                      <Activity className="h-7 w-7 text-muted-foreground" strokeWidth={1.5} />
                    </div>
                    <div>
                      <p className="font-medium">No health score yet</p>
                      <p className="text-sm text-muted-foreground">Run analysis to get a data health assessment.</p>
                    </div>
                    <Button onClick={() => startAnalysis.mutate({ datasetId })} disabled={startAnalysis.isPending} size="sm">
                      Run Analysis
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Quick Actions */}
            <div>
              <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {[
                  { icon: FileSearch, label: "Data Profiling", href: `/profiling?dataset=${datasetId}` },
                  { icon: Sparkles, label: "Data Cleaning", href: `/cleaning?dataset=${datasetId}` },
                  { icon: BarChart3, label: "Visualization Studio", href: `/visualizations?dataset=${datasetId}` },
                  { icon: Cpu, label: "AutoML Studio", href: `/automl?dataset=${datasetId}` },
                  { icon: TrainFront, label: "Model Training", href: `/training?dataset=${datasetId}` },
                  { icon: Lightbulb, label: "AI Insights", href: `/insights?dataset=${datasetId}` },
                ].map((action) => (
                  <Card
                    key={action.label}
                    className="cursor-pointer hover:shadow-md hover:border-primary/20 transition-all group"
                    onClick={() => router.push(action.href)}
                  >
                    <CardContent className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                          <action.icon className="h-5 w-5 text-primary" strokeWidth={1.5} />
                        </div>
                        <span className="text-sm font-medium">{action.label}</span>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Tab: Data Preview */}
        {activeTab === "preview" && <DataTable preview={preview} />}

        {/* Tab: Columns */}
        {activeTab === "columns" && <ColumnStats columns={preview.columns} />}

        {/* Tab: Actions */}
        {activeTab === "actions" && (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Dataset Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Perform operations on this dataset.
                </p>
                <div className="flex flex-wrap gap-3">
                  <Button onClick={() => startAnalysis.mutate({ datasetId })} disabled={startAnalysis.isPending}>
                    <Activity className="mr-1.5 h-4 w-4" />
                    Run Full Analysis
                  </Button>
                  <Button variant="outline" onClick={() => router.push(`/export?dataset=${datasetId}`)}>
                    <FileText className="mr-1.5 h-4 w-4" />
                    Export Results
                  </Button>
                  <Button variant="destructive" onClick={() => setDeleteDialogOpen(true)}>
                    <Trash2 className="mr-1.5 h-4 w-4" />
                    Delete Dataset
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Delete confirmation dialog */}
            <Dialog
              open={deleteDialogOpen}
              onClose={() => setDeleteDialogOpen(false)}
              title="Delete Dataset"
              description="Are you sure you want to delete this dataset and all associated analysis results? This action cannot be undone."
              size="sm"
            >
              <div className="flex justify-end gap-3 mt-2">
                <Button variant="outline" onClick={() => setDeleteDialogOpen(false)} disabled={deleting}>
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  disabled={deleting}
                  onClick={async () => {
                    setDeleting(true);
                    try {
                      const { deleteDataset } = await import("@/services/api");
                      await deleteDataset(datasetId);
                      router.push("/datasets");
                    } catch {
                      setDeleting(false);
                      setDeleteDialogOpen(false);
                    }
                  }}
                >
                  {deleting ? "Deleting..." : "Delete"}
                </Button>
              </div>
            </Dialog>
          </div>
        )}
      </div>
    </AppShell>
  );
}

export default function DatasetDetailPage() {
  return (
    <Suspense fallback={
      <AppShell>
        <div className="max-w-7xl mx-auto px-6 py-10">
          <LoadingScreen message="Loading..." />
        </div>
      </AppShell>
    }>
      <DatasetDetailContent />
    </Suspense>
  );
}
