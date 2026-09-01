"use client";

import { Suspense } from "react";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useRouter, useSearchParams } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { LoadingScreen } from "@/components/ui/loading-screen";
import { ErrorState } from "@/components/ui/error-state";
import { EmptyState } from "@/components/ui/empty-state";
import { HealthScoreCard } from "@/components/dashboard/HealthScoreCard";
import { ColumnStats } from "@/components/dashboard/ColumnStats";
import { useDatasetPreview, useAnalysisResults, useStartAnalysis } from "@/hooks/useAnalysis";
import {
  FileSearch,
  Activity,
  RefreshCw,
  BarChart3,
  AlertTriangle,
  CheckCircle2,
  Info,
  ArrowRight,
  Database,
  Brain,
} from "lucide-react";
import { useState } from "react";

function ProfilingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const datasetId = searchParams.get("dataset");
  const [activeTab, setActiveTab] = useState("overview");
  usePageTitle("Data Profiling");

  const { data: preview, isLoading, error, refetch } = useDatasetPreview(datasetId);
  const { data: results } = useAnalysisResults(datasetId);
  const startAnalysis = useStartAnalysis();

  const profiling = results?.results?.find((r) => r.analysis_type === "profiling")?.result_data as Record<string, unknown> | undefined;
  const healthScore = (profiling?.health_score as Record<string, unknown>) || {};
  const issues = (profiling?.data_quality_issues as any[]) || [];
  const recommendations = (profiling?.recommendations as string[]) || [];

  // ── No Dataset ──
  if (!datasetId) {
    return (
      <AppShell>
        <div className="max-w-4xl mx-auto px-6 py-10">
          <EmptyState
            icon={Database}
            title="Select a dataset"
            description="Choose a dataset to view its profiling results and data quality assessment."
            action={{ label: "Go to Datasets", onClick: () => router.push("/datasets") }}
          />
        </div>
      </AppShell>
    );
  }

  // ── Loading ──
  if (isLoading) {
    return (
      <AppShell>
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">Data Profiling</h1>
              <p className="text-sm text-muted-foreground mt-1">Loading dataset schema…</p>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-xl border border-border bg-card p-4">
                <Skeleton className="h-3 w-20 mb-2" />
                <Skeleton className="h-6 w-16" />
              </div>
            ))}
          </div>
          <Skeleton className="h-10 w-full mb-6" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Skeleton className="h-64 w-full rounded-xl" />
            <Skeleton className="h-64 w-full rounded-xl" />
          </div>
        </div>
      </AppShell>
    );
  }

  // ── Error ──
  if (error) {
    return (
      <AppShell>
        <div className="max-w-4xl mx-auto px-6 py-10">
          <ErrorState title="Failed to load profiling" onRetry={() => refetch()} onBack={() => router.push("/datasets")} />
        </div>
      </AppShell>
    );
  }

  const tabs = [
    { id: "overview", label: "Overview", badge: healthScore.overall_score !== undefined ? "Score" : undefined },
    { id: "columns", label: "Columns", badge: preview?.columns?.length.toString() },
    { id: "quality", label: "Data Quality", badge: issues.length > 0 ? issues.length.toString() : undefined },
    { id: "recommendations", label: "Recommendations" },
  ];

  return (
    <AppShell>
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Data Profiling</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {preview?.filename || "Dataset"} &mdash; Schema detection, quality scoring, and anomaly identification
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={() => router.push(`/cleaning?dataset=${datasetId}`)}>
              Go to Cleaning <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
            </Button>
            <Button size="sm" onClick={() => startAnalysis.mutate({ datasetId })} disabled={startAnalysis.isPending}>
              {startAnalysis.isPending ? (
                <><RefreshCw className="mr-1.5 h-4 w-4 animate-spin" /> Profiling...</>
              ) : (
                <><Activity className="mr-1.5 h-4 w-4" /> {results?.status === "completed" ? "Re-profile" : "Run Profiling"}</>
              )}
            </Button>
          </div>
        </div>

        {/* Quick Stats */}
        {preview && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground mb-1">Total Rows</p>
                <p className="text-2xl font-bold">{preview.num_rows.toLocaleString()}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground mb-1">Columns</p>
                <p className="text-2xl font-bold">{preview.num_columns}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground mb-1">Missing Values</p>
                <p className="text-2xl font-bold">
                  {preview.columns.reduce((sum, c) => sum + c.null_count, 0).toLocaleString()}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground mb-1">Columns with Nulls</p>
                <p className="text-2xl font-bold">
                  {preview.columns.filter((c) => c.null_count > 0).length}
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Tabs */}
        <Tabs tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} variant="underline" className="mb-6" />

        {/* Overview Tab */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            {healthScore.overall_score !== undefined ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <HealthScoreCard
                  score={healthScore.overall_score as number}
                  completeness={healthScore.completeness as number}
                  consistency={healthScore.consistency as number}
                  validity={healthScore.validity as number}
                />
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">Schema Summary</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {[
                      { label: "Numeric Columns", value: preview?.columns.filter((c) => ["int64", "float64", "number"].includes(c.dtype)).length || 0 },
                      { label: "Text Columns", value: preview?.columns.filter((c) => ["object", "string", "text"].includes(c.dtype)).length || 0 },
                      { label: "Date Columns", value: preview?.columns.filter((c) => ["datetime64", "datetime", "date"].includes(c.dtype)).length || 0 },
                      { label: "Boolean Columns", value: preview?.columns.filter((c) => ["bool", "boolean"].includes(c.dtype)).length || 0 },
                    ].map((item) => (
                      <div key={item.label} className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">{item.label}</span>
                        <span className="text-sm font-medium">{item.value}</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>
            ) : (
              <div className="text-center py-16">
                <div className="flex flex-col items-center gap-4">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
                    <FileSearch className="h-8 w-8 text-primary" strokeWidth={1.5} />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold mb-1">No profiling data yet</h3>
                    <p className="text-sm text-muted-foreground">Run the analysis to generate data profiling results.</p>
                  </div>
                  <Button onClick={() => startAnalysis.mutate({ datasetId })} disabled={startAnalysis.isPending}>
                    Run Analysis Now
                  </Button>
                </div>
              </div>
            )}

            {preview && <ColumnStats columns={preview.columns} />}
          </div>
        )}

        {/* Columns Tab */}
        {activeTab === "columns" && preview && <ColumnStats columns={preview.columns} />}

        {/* Quality Tab */}
        {activeTab === "quality" && (
          <div className="space-y-4">
            {issues.length === 0 ? (
              <Card>
                <CardContent className="p-10 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <CheckCircle2 className="h-10 w-10 text-emerald-500" />
                    <p className="font-medium">No data quality issues detected</p>
                    <p className="text-sm text-muted-foreground">Run profiling to identify potential issues.</p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              issues.map((issue: any, i: number) => (
                <Card key={i}>
                  <CardContent className="p-4 flex items-start gap-3">
                    <AlertTriangle className={`h-5 w-5 shrink-0 mt-0.5 ${
                      issue.severity === "high" ? "text-destructive" :
                      issue.severity === "medium" ? "text-amber-500" : "text-muted-foreground"
                    }`} />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-sm font-medium">{issue.title || issue.column || `Issue #${i + 1}`}</p>
                        <Badge variant={
                          issue.severity === "high" ? "destructive" :
                          issue.severity === "medium" ? "warning" : "secondary"
                        }>
                          {issue.severity || "info"}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{issue.description || issue.message}</p>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}

        {/* Recommendations Tab */}
        {activeTab === "recommendations" && (
          <div className="space-y-4">
            {recommendations.length === 0 ? (
              <Card>
                <CardContent className="p-10 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <Brain className="h-10 w-10 text-muted-foreground" strokeWidth={1.5} />
                    <p className="font-medium">No recommendations yet</p>
                    <p className="text-sm text-muted-foreground">Run profiling to get AI-generated recommendations.</p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              recommendations.map((rec: string, i: number) => (
                <Card key={i}>
                  <CardContent className="p-4 flex items-start gap-3">
                    <Info className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <p className="text-sm">{rec}</p>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}
      </div>
    </AppShell>
  );
}

export default function ProfilingPage() {
  return (
    <Suspense fallback={
      <AppShell>
        <div className="max-w-7xl mx-auto px-6 py-10">
          <LoadingScreen message="Loading profiling..." />
        </div>
      </AppShell>
    }>
      <ProfilingContent />
    </Suspense>
  );
}
