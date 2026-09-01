"use client";

import { useState, useEffect, Suspense } from "react";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useRouter, useSearchParams } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { HealthScoreCard } from "@/components/dashboard/HealthScoreCard";
import { KPICard } from "@/components/dashboard/KPICard";
import { ChartCard } from "@/components/dashboard/ChartCard";
import { DataTable } from "@/components/dashboard/DataTable";
import { ColumnStats } from "@/components/dashboard/ColumnStats";
import { InsightsPanel } from "@/components/dashboard/InsightsPanel";
import { ProgressCard } from "@/components/dashboard/ProgressCard";
import type { StepStatus } from "@/components/dashboard/ProgressCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { LoadingScreen } from "@/components/ui/loading-screen";
import { ErrorState } from "@/components/ui/error-state";
import { EmptyState } from "@/components/ui/empty-state";
import { useDatasetPreview, useAnalysisResults, useStartAnalysis } from "@/hooks/useAnalysis";
import {
  Database,
  Upload,
  FileSearch,
  Sparkles,
  BarChart3,
  Lightbulb,
  MessageSquareText,
  FileText,
  Layers,
  Activity,
  RefreshCw,
  ArrowRight,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface WorkflowStep {
  id: string;
  icon: LucideIcon;
  title: string;
  description: string;
  href: string;
  getStatus: (hasDataset: boolean, hasResults: boolean, status?: string) => StepStatus;
  actionLabel: string;
}

const WORKFLOW_STEPS: WorkflowStep[] = [
  {
    id: "upload",
    icon: Upload,
    title: "Upload Dataset",
    description: "Upload your CSV, XLSX, or XLS file to begin analysis",
    href: "/datasets/upload",
    getStatus: (hasDataset) => hasDataset ? "completed" : "in_progress",
    actionLabel: "Upload Data",
  },
  {
    id: "profile",
    icon: FileSearch,
    title: "Data Profiling",
    description: "Review schema, data types, quality scores, and column statistics",
    href: "/profiling",
    getStatus: (hasDataset, hasResults, status) =>
      !hasDataset ? "pending" : status === "completed" ? "completed" : "pending",
    actionLabel: "View Profile",
  },
  {
    id: "clean",
    icon: Sparkles,
    title: "Data Cleaning",
    description: "AI recommends — you choose which cleaning actions to apply",
    href: "/cleaning",
    getStatus: (hasDataset, hasResults, status) =>
      !hasDataset ? "pending" : hasResults ? "in_progress" : "pending",
    actionLabel: "Clean Data",
  },
  {
    id: "analyze",
    icon: BarChart3,
    title: "Statistical Analysis",
    description: "Run descriptive stats, correlations, regression, clustering, and more",
    href: "/analysis",
    getStatus: (hasDataset, hasResults, status) =>
      !hasDataset ? "pending" : hasResults ? "in_progress" : "pending",
    actionLabel: "Analyze",
  },
  {
    id: "visualize",
    icon: Activity,
    title: "Visualization Studio",
    description: "Create charts by choosing type, axes, aggregation, color, and filters",
    href: "/visualizations",
    getStatus: (hasDataset, hasResults, status) =>
      !hasDataset ? "pending" : hasResults ? "in_progress" : "pending",
    actionLabel: "Build Charts",
  },
  {
    id: "insights",
    icon: Lightbulb,
    title: "AI Insights",
    description: "Executive summaries, opportunities, risks, and recommendations",
    href: "/insights",
    getStatus: (hasDataset, hasResults, status) =>
      !hasDataset ? "pending" : status === "completed" ? "completed" : "pending",
    actionLabel: "View Insights",
  },
  {
    id: "chat",
    icon: MessageSquareText,
    title: "Chat with Data",
    description: "Ask questions in plain English and get instant answers",
    href: "/chat",
    getStatus: (hasDataset) => hasDataset ? "in_progress" : "pending",
    actionLabel: "Open Chat",
  },
  {
    id: "reports",
    icon: FileText,
    title: "Reports & Export",
    description: "Generate reports and export results in multiple formats",
    href: "/reports",
    getStatus: (hasDataset, hasResults, status) =>
      !hasDataset ? "pending" : hasResults ? "in_progress" : "pending",
    actionLabel: "View Reports",
  },
];

function DashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const datasetId = searchParams.get("dataset");
  const [selectedDataset, setSelectedDataset] = useState<string | null>(datasetId);
  usePageTitle("Dashboard");

  useEffect(() => {
    if (datasetId) setSelectedDataset(datasetId);
  }, [datasetId]);

  const { data: preview, isLoading: previewLoading, error: previewError, refetch: refetchPreview } = useDatasetPreview(selectedDataset);
  const { data: results, isLoading: resultsLoading } = useAnalysisResults(selectedDataset);
  const startAnalysis = useStartAnalysis();

  const hasDataset = !!selectedDataset;
  const analysisStatus = results?.status;

  const handleStartAnalysis = () => {
    if (selectedDataset) {
      startAnalysis.mutate({ datasetId: selectedDataset });
    }
  };

  // --- No Dataset State ---
  if (!selectedDataset) {
    return (
      <AppShell>
        <div className="max-w-4xl mx-auto px-6 py-10">
          <div className="mb-8">
            <h1 className="text-2xl font-bold">Welcome to Data Analyst</h1>
            <p className="text-muted-foreground mt-1">
              Upload a dataset to get started with your analysis workflow.
            </p>
          </div>
          <EmptyState
            icon={Database}
            title="No dataset selected"
            description="Upload a CSV, XLSX, or XLS file to begin your data analysis journey. Your datasets will appear here once uploaded."
            action={{ label: "Upload Dataset", onClick: () => router.push("/datasets/upload") }}
          />
        </div>
      </AppShell>
    );
  }

  // --- Loading State ---
  if (previewLoading) {
    return (
      <AppShell>
        <div className="max-w-7xl mx-auto px-6 py-10">
          <LoadingScreen message="Loading dataset..." />
        </div>
      </AppShell>
    );
  }

  // --- Error State ---
  if (previewError) {
    return (
      <AppShell>
        <div className="max-w-4xl mx-auto px-6 py-10">
          <ErrorState
            title="Failed to load dataset"
            message="There was an error loading your dataset. It may have been deleted or the server may be unavailable."
            onRetry={() => refetchPreview()}
            onBack={() => setSelectedDataset(null)}
          />
        </div>
      </AppShell>
    );
  }

  // Extract analysis data
  const profiling = results?.results?.find((r) => r.analysis_type === "profiling")?.result_data as Record<string, unknown> | undefined;
  const analytics = results?.results?.find((r) => r.analysis_type === "analytics")?.result_data as Record<string, unknown> | undefined;
  const vizResult = results?.results?.find((r) => r.analysis_type === "visualization")?.result_data as Record<string, unknown> | undefined;
  const insightsResult = results?.results?.find((r) => r.analysis_type === "insights")?.result_data as Record<string, unknown> | undefined;

  const healthScore = (profiling?.health_score as Record<string, unknown>) || {};
  const rawKpis = analytics?.kpis;
  const kpis: any[] = Array.isArray(rawKpis) ? rawKpis
    : (rawKpis && typeof rawKpis === "object" && Array.isArray((rawKpis as any).kpis)) ? (rawKpis as any).kpis
    : [];
  const charts: any[] = (vizResult?.charts as any[]) || [];
  const insights = (insightsResult?.ai_analysis as Record<string, unknown>) || {};

  return (
    <AppShell>
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* ── Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div className="min-w-0">
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-semibold tracking-tight truncate">
                {preview?.filename || "Dataset Dashboard"}
              </h1>
              <Badge
                variant={
                  analysisStatus === "completed" ? "success"
                  : analysisStatus === "processing" ? "warning"
                  : analysisStatus === "failed" ? "destructive"
                  : "secondary"
                }
              >
                {analysisStatus || "pending"}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {preview?.num_rows?.toLocaleString()} rows &times; {preview?.num_columns} columns
              {preview?.file_size_mb ? ` • ${preview.file_size_mb.toFixed(2)} MB` : ""}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push(`/datasets/${selectedDataset}`)}
            >
              <Layers className="mr-1.5 h-4 w-4" />
              Dataset Overview
            </Button>
            <Button
              onClick={handleStartAnalysis}
              disabled={startAnalysis.isPending || resultsLoading}
              size="sm"
            >
              {startAnalysis.isPending ? (
                <>
                  <RefreshCw className="mr-1.5 h-4 w-4 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Activity className="mr-1.5 h-4 w-4" />
                  {analysisStatus === "completed" ? "Re-analyze" : "Run Analysis"}
                </>
              )}
            </Button>
          </div>
        </div>

        {/* ── Workflow Progress Cards ── */}
        <div className="mb-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Workflow Progress</h2>
            <span className="text-xs text-muted-foreground">
              {WORKFLOW_STEPS.filter((s) => s.getStatus(hasDataset, !!results, analysisStatus) === "completed").length} of{" "}
              {WORKFLOW_STEPS.length} steps
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {WORKFLOW_STEPS.map((step, i) => (
              <ProgressCard
                key={step.id}
                icon={step.icon}
                title={step.title}
                description={step.description}
                status={step.getStatus(hasDataset, !!results, analysisStatus)}
                actionLabel={step.actionLabel}
                stepNumber={i + 1}
                onAction={() => router.push(step.href + `?dataset=${selectedDataset}`)}
              />
            ))}
          </div>
        </div>

        <Separator className="mb-8" />

        {/* ── No Results Yet ── */}
        {(!results || results.results.length === 0) && (
          <Card className="text-center py-16 mb-8">
            <CardContent>
              <div className="flex flex-col items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
                  <Activity className="h-8 w-8 text-primary" strokeWidth={1.5} />
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-1">No analysis results yet</h3>
                  <p className="text-sm text-muted-foreground max-w-md mx-auto">
                    Click &quot;Run Analysis&quot; to start profiling your dataset, generate visualizations,
                    and extract business insights using our AI agents.
                  </p>
                </div>
                <Button onClick={handleStartAnalysis} size="lg" disabled={startAnalysis.isPending} className="mt-2">
                  {startAnalysis.isPending ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      Running Analysis...
                    </>
                  ) : (
                    <>
                      Run Multi-Agent Analysis
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── Results ── */}
        {results && results.results.length > 0 && (
          <div className="space-y-8">
            {/* Health Score + KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {healthScore.overall_score !== undefined && (
                <HealthScoreCard
                  score={healthScore.overall_score as number}
                  completeness={healthScore.completeness as number}
                  consistency={healthScore.consistency as number}
                  validity={healthScore.validity as number}
                />
              )}
              {kpis.slice(0, 3).map((kpi: any) => (
                <KPICard key={kpi.name} kpi={kpi} />
              ))}
            </div>

            {/* Quick Charts */}
            {charts.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold">Quick Visualizations</h2>
                  <Button variant="outline" size="sm" onClick={() => router.push(`/visualizations?dataset=${selectedDataset}`)}>
                    Open Studio <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                  </Button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {charts.slice(0, 4).map((chart: any) => (
                    <ChartCard key={chart.chart_id} chart={chart} />
                  ))}
                </div>
              </div>
            )}

            {/* Insights Summary */}
            {insights.executive_summary && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold">AI Insights</h2>
                  <Button variant="outline" size="sm" onClick={() => router.push(`/insights?dataset=${selectedDataset}`)}>
                    Full Insights <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                  </Button>
                </div>
                <InsightsPanel
                  executive_summary={insights.executive_summary as string}
                  key_findings={insights.key_findings as any}
                  opportunities={insights.opportunities as string[]}
                  risks={insights.risks as string[]}
                  action_items={insights.action_items as any}
                />
              </div>
            )}

            {/* Data Preview */}
            {preview && (
              <div>
                <h2 className="text-lg font-semibold mb-4">Data Preview</h2>
                <DataTable preview={preview} />
              </div>
            )}

            {/* Column Stats */}
            {preview && (
              <div>
                <h2 className="text-lg font-semibold mb-4">Column Statistics</h2>
                <ColumnStats columns={preview.columns} />
              </div>
            )}
          </div>
        )}
      </div>
    </AppShell>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={
      <AppShell>
        <div className="max-w-7xl mx-auto px-6 py-10">
          <LoadingScreen message="Loading dashboard..." />
        </div>
      </AppShell>
    }>
      <DashboardContent />
    </Suspense>
  );
}
