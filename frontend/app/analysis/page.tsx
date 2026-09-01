"use client";

import { Suspense, useState, useEffect } from "react";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useRouter, useSearchParams } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Tabs } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { LoadingScreen } from "@/components/ui/loading-screen";
import { ErrorState } from "@/components/ui/error-state";
import { EmptyState } from "@/components/ui/empty-state";
import { useDatasetPreview, useAnalysisResults, useStartAnalysis } from "@/hooks/useAnalysis";
import { motion, AnimatePresence } from "framer-motion";
import {
  BarChart3,
  Database,
  RefreshCw,
  CheckCircle2,
  Activity,
  TrendingUp,
  ArrowRight,
  Sigma,
  GitBranch,
  Layers,
  LineChart,
  Star,
  Brain,
  Play,
  Loader2,
  FileSearch,
} from "lucide-react";

interface AnalysisOption {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  category: "descriptive" | "predictive" | "advanced";
  badge?: string;
}

const ANALYSIS_OPTIONS: AnalysisOption[] = [
  {
    id: "descriptive_statistics",
    title: "Descriptive Statistics",
    description: "Mean, median, standard deviation, quartiles, min, max and distribution metrics for all numeric columns",
    icon: Sigma,
    category: "descriptive",
  },
  {
    id: "correlation",
    title: "Correlation Analysis",
    description: "Pearson, Spearman, and Kendall correlation matrices between numeric variables with significance tests",
    icon: Activity,
    category: "descriptive",
  },
  {
    id: "regression",
    title: "Regression Analysis",
    description: "Linear, multiple, and polynomial regression with coefficients, R-squared, and residual analysis",
    icon: TrendingUp,
    category: "predictive",
  },
  {
    id: "classification",
    title: "Classification",
    description: "Logistic regression, decision trees, and random forest with accuracy, precision, recall, and F1 scores",
    icon: GitBranch,
    category: "predictive",
    badge: "ML",
  },
  {
    id: "clustering",
    title: "Clustering",
    description: "K-means, hierarchical, and DBSCAN clustering with silhouette scores and cluster visualization",
    icon: Layers,
    category: "predictive",
    badge: "ML",
  },
  {
    id: "forecasting",
    title: "Forecasting",
    description: "Time series forecasting using ARIMA, exponential smoothing, and trend decomposition",
    icon: LineChart,
    category: "predictive",
  },
  {
    id: "feature_importance",
    title: "Feature Importance",
    description: "Identify the most influential features using permutation importance, SHAP values, and feature selection",
    icon: Star,
    category: "advanced",
    badge: "AI",
  },
];

function AnalysisContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const datasetId = searchParams.get("dataset");

  const { data: preview, isLoading, error } = useDatasetPreview(datasetId);
  const { data: results } = useAnalysisResults(datasetId);
  const startAnalysis = useStartAnalysis();

  const [selectedAnalyses, setSelectedAnalyses] = useState<Set<string>>(new Set(["descriptive_statistics", "correlation"]));
  usePageTitle("Statistical Analysis");
  const [running, setRunning] = useState(false);
  const [activeCategory, setActiveCategory] = useState("all");

  const toggleAnalysis = (id: string) => {
    setSelectedAnalyses((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleRunAnalysis = async () => {
    if (selectedAnalyses.size === 0 || !datasetId) return;
    setRunning(true);

    try {
      // Start analysis with selected types via the backend
      await startAnalysis.mutateAsync({
        datasetId,
        types: Array.from(selectedAnalyses),
      });
      // The useAnalysisResults hook polls for completion.
      // Mark all selected as running — they'll update when results arrive.
      // We poll every 3s via refetchInterval in useAnalysisResults
    } catch {
      // Error toast handled by hook
    }
  };

  // The backend maps the page's selected analyses onto its pipeline stages
  // (profiling / analytics / visualization / insights). `availableTypes` is the
  // set of stages that actually ran, so completion is judged per-option by
  // mapping the option's id → stage via TYPE_ALIASES and checking membership.
  const TYPE_ALIASES: Record<string, string> = {
    descriptive_statistics: "analytics",
    correlation: "analytics",
    regression: "analytics",
    classification: "analytics",
    clustering: "analytics",
    forecasting: "analytics",
    feature_importance: "profiling",
  };
  const availableTypes = results?.results?.map((r) => r.analysis_type) || [];
  const hasRunResults = availableTypes.length > 0 && results?.status === "completed";

  const isOptionCompleted = (optionId: string) => {
    const stage = TYPE_ALIASES[optionId] || optionId;
    return availableTypes.includes(stage);
  };

  const completedCount = Array.from(selectedAnalyses).filter(isOptionCompleted).length;

  const allCompleted =
    selectedAnalyses.size > 0 &&
    completedCount === selectedAnalyses.size &&
    hasRunResults;

  useEffect(() => {
    if (hasRunResults) {
      setRunning(false);
    }
  }, [hasRunResults]);

  const categories = [
    { id: "all", label: "All Analyses" },
    { id: "descriptive", label: "Descriptive" },
    { id: "predictive", label: "Predictive" },
    { id: "advanced", label: "Advanced" },
  ];

  const filteredOptions = activeCategory === "all"
    ? ANALYSIS_OPTIONS
    : ANALYSIS_OPTIONS.filter((o) => o.category === activeCategory);

  // ── No Dataset ──
  if (!datasetId) {
    return (
      <AppShell>
        <div className="max-w-5xl mx-auto px-6 py-10">
          <EmptyState
            icon={Database}
            title="Select a dataset"
            description="Choose a dataset to run statistical analyses. You select which analyses to perform."
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
          <LoadingScreen message="Loading dataset..." />
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
      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold">Statistical Analysis</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {preview?.filename} &mdash; Select the analyses you want to run. You control which are executed.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              size="lg"
              onClick={handleRunAnalysis}
              disabled={selectedAnalyses.size === 0 || running}
              className="shadow-lg shadow-primary/20"
            >
              {running ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Running...</>
              ) : allCompleted ? (
                <><RefreshCw className="mr-2 h-4 w-4" /> Re-run Selected</>
              ) : (
                <><Play className="mr-2 h-4 w-4" /> Run {selectedAnalyses.size} Analysis{selectedAnalyses.size !== 1 ? "es" : ""}</>
              )}
            </Button>
          </div>
        </div>

        {/* Progress */}
        {running && (
          <Card className="mb-8 border-primary/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  <span className="text-sm font-medium">Running analyses...</span>
                </div>
                <span className="text-xs text-muted-foreground">
                  {completedCount} / {selectedAnalyses.size}
                </span>
              </div>
              <Progress value={(completedCount / selectedAnalyses.size) * 100} size="sm" />
              <div className="flex flex-wrap gap-2 mt-3">
                {Array.from(selectedAnalyses).map((id) => {
                  const opt = ANALYSIS_OPTIONS.find((o) => o.id === id);
                  const done = isOptionCompleted(id);
                  return (
                    <Badge key={id} variant={done ? "success" : "secondary"} className="text-[10px]">
                      {done ? "✓ " : "⟳ "}
                      {opt?.title || id}
                    </Badge>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Success state */}
        {allCompleted && !running && (
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
                    <p className="text-sm font-medium">All analyses completed successfully</p>
                    <p className="text-xs text-muted-foreground">{completedCount} analysis types completed</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => router.push(`/insights?dataset=${datasetId}`)}>
                    View Insights <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Category tabs */}
        <div className="flex flex-wrap gap-2 mb-6">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeCategory === cat.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Analysis options grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredOptions.map((option) => {
            const selected = selectedAnalyses.has(option.id);
            const isCompleted = isOptionCompleted(option.id);
            const isRunning = running && selected && !isCompleted;
            const Icon = option.icon;

            return (
              <Card
                key={option.id}
                className={`cursor-pointer transition-all duration-200 ${
                  selected
                    ? "border-primary/30 shadow-sm"
                    : "hover:border-border/80 hover:shadow-sm"
                } ${isCompleted ? "border-emerald-500/20" : ""}`}
                onClick={() => !running && toggleAnalysis(option.id)}
              >
                <CardContent className="p-5">
                  <div className="flex items-start gap-4">
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors ${
                      selected ? "bg-primary/10" : "bg-muted"
                    }`}>
                      <Icon className={`h-5 w-5 ${selected ? "text-primary" : "text-muted-foreground"}`} strokeWidth={1.5} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-sm font-medium">{option.title}</p>
                        {option.badge && (
                          <Badge variant="secondary" className="text-[10px]">{option.badge}</Badge>
                        )}
                        {isCompleted && (
                          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                        )}
                        {isRunning && (
                          <Loader2 className="h-4 w-4 animate-spin text-primary" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">{option.description}</p>
                    </div>
                    <Switch
                      checked={selected}
                      disabled={running}
                      size="sm"
                    />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Selection summary */}
        <div className="flex items-center justify-between mt-8 p-4 rounded-xl bg-muted/30">
          <div className="flex items-center gap-3">
            <BarChart3 className="h-5 w-5 text-primary" strokeWidth={1.5} />
            <div>
              <p className="text-sm font-medium">
                {selectedAnalyses.size} of {ANALYSIS_OPTIONS.length} analyses selected
              </p>
              <p className="text-xs text-muted-foreground">
                You control which analyses to run. Click any card to toggle.
              </p>
            </div>
          </div>
          <Button
            onClick={handleRunAnalysis}
            disabled={selectedAnalyses.size === 0 || running}
          >
            {running ? (
              <><Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> Running...</>
            ) : (
              <><Play className="mr-1.5 h-4 w-4" /> Run Selected</>
            )}
          </Button>
        </div>

        {/* Results section */}
        {allCompleted && !running && (
          <div className="mt-8">
            <Separator className="mb-6" />
            <h2 className="text-lg font-semibold mb-4">Analysis Results</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Array.from(selectedAnalyses).filter(isOptionCompleted).map((id) => {
                const opt = ANALYSIS_OPTIONS.find((o) => o.id === id);
                if (opt) {
                  return (
                    <Card key={id}>
                      <CardHeader className="pb-2">
                        <div className="flex items-center gap-2">
                          <opt.icon className="h-4 w-4 text-primary" strokeWidth={1.5} />
                          <CardTitle className="text-sm font-medium">{opt.title}</CardTitle>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="rounded-lg bg-muted/30 p-4 text-center">
                          <p className="text-xs text-muted-foreground">
                            Analysis completed. View and visualize the results below.
                          </p>
                          <Button
                            variant="outline"
                            size="sm"
                            className="mt-3"
                            onClick={() => router.push(`/visualizations?dataset=${datasetId}`)}
                          >
                            Create Visualization
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                }
                // Backend pipeline stages (profiling, analytics, visualization, insights)
                // map back to their actual stored results.
                const stageResult = results?.results?.find((r) => r.analysis_type === id);
                if (!stageResult) return null;
                const stageData = (stageResult.result_data || {}) as Record<string, unknown>;
                const stageLabels: Record<string, string> = {
                  profiling: "Data Profiling",
                  analytics: "Statistical Analysis",
                  visualization: "Visualizations",
                  insights: "AI Insights",
                };
                const stageIcons: Record<string, React.ElementType> = {
                  profiling: FileSearch,
                  analytics: Sigma,
                  visualization: BarChart3,
                  insights: Brain,
                };
                const StageIcon = stageIcons[id] || Activity;
                let summary = "Results ready.";
                if (id === "profiling") {
                  const health = (stageData.health_score as Record<string, unknown>) || {};
                  if (health.overall_score !== undefined) {
                    summary = `Health score: ${health.overall_score}/100 · ${stageData.column_statistics && Object.keys(stageData.column_statistics as object).length} columns analyzed`;
                  }
                } else if (id === "analytics") {
                  const kpis = stageData.kpis;
                  const kpiList = Array.isArray(kpis) ? kpis : (kpis as { kpis?: unknown[] } | undefined)?.kpis;
                  summary = `${(kpiList as unknown[])?.length || 0} KPIs computed · ${(stageData.summary_statistics && Object.keys(stageData.summary_statistics as object).length) || 0} statistics`;
                } else if (id === "visualization") {
                  const charts = (stageData.charts as unknown[]) || [];
                  summary = `${charts.length} charts generated`;
                } else if (id === "insights") {
                  const ai = (stageData.ai_analysis as Record<string, unknown>) || {};
                  const hasContent = Object.keys(ai).length > 0;
                  summary = hasContent
                    ? "AI insights available."
                    : "No AI insights (no AI provider configured).";
                }
                return (
                  <Card key={id}>
                    <CardHeader className="pb-2">
                      <div className="flex items-center gap-2">
                        <StageIcon className="h-4 w-4 text-primary" strokeWidth={1.5} />
                        <CardTitle className="text-sm font-medium">{stageLabels[id] || id}</CardTitle>
                        <Badge variant="success" className="text-[10px]">Complete</Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="rounded-lg bg-muted/30 p-4 text-center">
                        <p className="text-xs text-muted-foreground">{summary}</p>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}

export default function AnalysisPage() {
  return (
    <Suspense fallback={
      <AppShell>
        <div className="max-w-5xl mx-auto px-6 py-10">
          <LoadingScreen message="Loading analysis workspace..." />
        </div>
      </AppShell>
    }>
      <AnalysisContent />
    </Suspense>
  );
}
