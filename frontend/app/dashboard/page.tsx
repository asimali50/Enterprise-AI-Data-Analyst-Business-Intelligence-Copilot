"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Navigation } from "@/components/Navigation";
import { FileUpload } from "@/components/dashboard/FileUpload";
import { HealthScoreCard } from "@/components/dashboard/HealthScoreCard";
import { KPICard } from "@/components/dashboard/KPICard";
import { ChartCard } from "@/components/dashboard/ChartCard";
import { DataTable } from "@/components/dashboard/DataTable";
import { ColumnStats } from "@/components/dashboard/ColumnStats";
import { InsightsPanel } from "@/components/dashboard/InsightsPanel";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useDatasetPreview, useAnalysisResults, useStartAnalysis } from "@/hooks/useAnalysis";

function DashboardContent() {
  const searchParams = useSearchParams();
  const datasetId = searchParams.get("dataset");
  const [selectedDataset, setSelectedDataset] = useState<string | null>(datasetId);

  useEffect(() => {
    if (datasetId) setSelectedDataset(datasetId);
  }, [datasetId]);

  const { data: preview } = useDatasetPreview(selectedDataset);
  const { data: results } = useAnalysisResults(selectedDataset);
  const startAnalysis = useStartAnalysis();

  const handleStartAnalysis = () => {
    if (selectedDataset) {
      startAnalysis.mutate({ datasetId: selectedDataset });
    }
  };

  if (!selectedDataset) {
    return (
      <div className="min-h-screen">
        <Navigation />
        <div className="max-w-3xl mx-auto px-6 py-16">
          <h1 className="text-2xl font-bold mb-6">Upload a Dataset</h1>
          <FileUpload onUploaded={(id) => setSelectedDataset(id)} />
        </div>
      </div>
    );
  }

  const profiling = results?.results?.find((r) => r.analysis_type === "profiling")?.result_data as Record<string, unknown> | undefined;
  const analytics = results?.results?.find((r) => r.analysis_type === "analytics")?.result_data as Record<string, unknown> | undefined;
  const vizResult = results?.results?.find((r) => r.analysis_type === "visualization")?.result_data as Record<string, unknown> | undefined;
  const insightsResult = results?.results?.find((r) => r.analysis_type === "insights")?.result_data as Record<string, unknown> | undefined;

  const healthScore = (profiling?.health_score as Record<string, unknown>) || {};
  // kpis may be a direct array or wrapped in { kpis: [...] }
  const rawKpis = analytics?.kpis;
  const kpis: any[] = Array.isArray(rawKpis) ? rawKpis
    : (rawKpis && typeof rawKpis === "object" && Array.isArray((rawKpis as any).kpis)) ? (rawKpis as any).kpis
    : [];
  const charts: any[] = (vizResult?.charts as any[]) || [];
  const insights = (insightsResult?.ai_analysis as Record<string, unknown>) || {};

  return (
    <div className="min-h-screen">
      <Navigation />
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold">{preview?.filename || "Dataset"}</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {preview?.num_rows?.toLocaleString()} rows × {preview?.num_columns} columns
              {preview?.file_size_mb ? ` • ${preview.file_size_mb.toFixed(2)} MB` : ""}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant={results?.status === "completed" ? "success" : results?.status === "processing" ? "warning" : "secondary"}>
              {results?.status || "pending"}
            </Badge>
            <Button onClick={handleStartAnalysis} disabled={startAnalysis.isPending}>
              {startAnalysis.isPending ? "Analyzing..." : results?.status === "completed" ? "Re-analyze" : "Start Analysis"}
            </Button>
          </div>
        </div>

        {/* No results yet */}
        {(!results || results.results.length === 0) && (
          <Card className="text-center py-16">
            <CardContent>
              <p className="text-muted-foreground mb-4">No analysis results yet.</p>
              <Button onClick={handleStartAnalysis} size="lg" disabled={startAnalysis.isPending}>
                Run Multi-Agent Analysis
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Results */}
        {results && results.results.length > 0 && (
          <div className="space-y-8">
            {/* Health Score + KPIs Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {healthScore.overall_score !== undefined && (
                <HealthScoreCard
                  score={healthScore.overall_score as number}
                  completeness={healthScore.completeness as number}
                  consistency={healthScore.consistency as number}
                  validity={healthScore.validity as number}
                />
              )}
              {kpis.slice(0, 3).map((kpi) => (
                <KPICard key={kpi.name} kpi={kpi as any} />
              ))}
            </div>

            {/* Charts */}
            {charts.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold mb-4">Visualizations</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {charts.map((chart: any) => (
                    <ChartCard key={chart.chart_id} chart={chart} />
                  ))}
                </div>
              </div>
            )}

            {/* Business Insights */}
            {insights.executive_summary && (
              <div>
                <h2 className="text-lg font-semibold mb-4">Business Insights</h2>
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
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <DashboardContent />
    </Suspense>
  );
}
