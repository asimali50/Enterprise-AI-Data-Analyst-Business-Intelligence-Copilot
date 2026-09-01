"use client";

import { Suspense, useState } from "react";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useRouter, useSearchParams } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { LoadingScreen } from "@/components/ui/loading-screen";
import { ErrorState } from "@/components/ui/error-state";
import { EmptyState } from "@/components/ui/empty-state";
import { InlineLoader } from "@/components/ui/loading-screen";
import { InsightsPanel } from "@/components/dashboard/InsightsPanel";
import { useDatasetPreview, useAnalysisResults, useStartAnalysis } from "@/hooks/useAnalysis";
import { motion } from "framer-motion";
import { Lightbulb, RefreshCw, Brain, TrendingUp, ArrowRight, Sparkles, MessageSquareText, FileText, Zap, BarChart3, Download } from "lucide-react";

function InsightsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const datasetId = searchParams.get("dataset");

  const { data: preview, isLoading, error } = useDatasetPreview(datasetId);
  const { data: results } = useAnalysisResults(datasetId);
  const startAnalysis = useStartAnalysis();
  const [activeTab, setActiveTab] = useState("overview");
  usePageTitle("AI Insights");

  const insightsResult = results?.results?.find((r) => r.analysis_type === "insights")?.result_data as Record<string, unknown> | undefined;
  const insights = (insightsResult?.ai_analysis as Record<string, unknown>) || {};

  // ── No Dataset ──
  if (!datasetId) {
    return (
      <AppShell>
        <div className="max-w-5xl mx-auto px-6 py-10">
          <EmptyState
            icon={Lightbulb}
            title="Select a dataset"
            description="Choose a dataset to view AI-powered business insights, opportunities, and recommendations."
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
          <LoadingScreen message="Generating AI insights..." />
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

  const hasInsights = !!insights.executive_summary;

  const tabs = [
    { id: "overview", label: "Overview" },
    { id: "findings", label: "Key Findings", badge: (insights.key_findings as any[])?.length?.toString() },
    { id: "actions", label: "Action Items", badge: (insights.action_items as any[])?.length?.toString() },
  ];

  return (
    <AppShell>
      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold">AI Insights</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {preview?.filename} &mdash; AI-generated business intelligence powered by multi-agent analysis
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={() => router.push(`/chat?dataset=${datasetId}`)}>
              <MessageSquareText className="mr-1.5 h-4 w-4" />
              Ask About Data
            </Button>
            <Button size="sm" onClick={() => startAnalysis.mutate({ datasetId })} disabled={startAnalysis.isPending}>
              {startAnalysis.isPending ? (
                <><RefreshCw className="mr-1.5 h-4 w-4 animate-spin" /> Generating...</>
              ) : (
                <><Brain className="mr-1.5 h-4 w-4" /> {hasInsights ? "Regenerate" : "Generate Insights"}</>
              )}
            </Button>
          </div>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <Lightbulb className="h-5 w-5 text-amber-500" strokeWidth={1.5} />
              <div>
                <p className="text-lg font-semibold">{(insights.key_findings as any[])?.length || 0}</p>
                <p className="text-[10px] text-muted-foreground">Key Findings</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <TrendingUp className="h-5 w-5 text-emerald-500" strokeWidth={1.5} />
              <div>
                <p className="text-lg font-semibold">{(insights.opportunities as string[])?.length || 0}</p>
                <p className="text-[10px] text-muted-foreground">Opportunities</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <Zap className="h-5 w-5 text-destructive" strokeWidth={1.5} />
              <div>
                <p className="text-lg font-semibold">{(insights.risks as string[])?.length || 0}</p>
                <p className="text-[10px] text-muted-foreground">Risks</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <Sparkles className="h-5 w-5 text-primary" strokeWidth={1.5} />
              <div>
                <p className="text-lg font-semibold">{(insights.action_items as any[])?.length || 0}</p>
                <p className="text-[10px] text-muted-foreground">Actions</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* No insights state */}
        {!hasInsights && (
          <Card className="text-center py-16">
            <CardContent>
              <div className="flex flex-col items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
                  <Lightbulb className="h-8 w-8 text-primary" strokeWidth={1.5} />
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-1">No insights generated yet</h3>
                  <p className="text-sm text-muted-foreground max-w-md">
                    Run the full analysis to generate AI-powered business insights including
                    executive summaries, key findings, opportunities, and risks.
                  </p>
                </div>
                <Button onClick={() => startAnalysis.mutate({ datasetId })} size="lg" disabled={startAnalysis.isPending}>
                  <Brain className="mr-2 h-4 w-4" />
                  Generate Insights
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Insights content */}
        {hasInsights && (
          <>
            <Tabs tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} variant="underline" className="mb-6" />

            {activeTab === "overview" && (
              <InsightsPanel
                executive_summary={insights.executive_summary as string}
                key_findings={insights.key_findings as any}
                opportunities={insights.opportunities as string[]}
                risks={insights.risks as string[]}
                action_items={insights.action_items as any}
              />
            )}

            {activeTab === "findings" && (
              <InsightsPanel
                key_findings={insights.key_findings as any}
              />
            )}

            {activeTab === "actions" && (
              <InsightsPanel
                action_items={insights.action_items as any}
              />
            )}
          </>
        )}

        {/* Next steps */}
        {hasInsights && (
          <div className="mt-8">
            <Separator className="mb-6" />
            <h2 className="text-lg font-semibold mb-4">Next Steps</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                { icon: MessageSquareText, label: "Chat with Data", desc: "Ask follow-up questions", href: `/chat?dataset=${datasetId}` },
                { icon: FileText, label: "Generate Report", desc: "Create a professional report", href: `/reports?dataset=${datasetId}` },
                { icon: BarChart3, label: "Visualize", desc: "Build custom charts", href: `/visualizations?dataset=${datasetId}` },
                { icon: Download, label: "Export", desc: "Download analysis results", href: `/export?dataset=${datasetId}` },
              ].map((step) => (
                <Card
                  key={step.label}
                  className="cursor-pointer hover:shadow-md hover:border-primary/20 transition-all group"
                  onClick={() => router.push(step.href)}
                >
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                        <step.icon className="h-5 w-5 text-primary" strokeWidth={1.5} />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{step.label}</p>
                        <p className="text-[10px] text-muted-foreground">{step.desc}</p>
                      </div>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}

export default function InsightsPage() {
  return (
    <Suspense fallback={
      <AppShell>
        <div className="max-w-5xl mx-auto px-6 py-10">
          <LoadingScreen message="Loading insights..." />
        </div>
      </AppShell>
    }>
      <InsightsContent />
    </Suspense>
  );
}
