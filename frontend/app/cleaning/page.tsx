"use client";

import { Suspense, useState, useEffect } from "react";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useRouter, useSearchParams } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { LoadingScreen } from "@/components/ui/loading-screen";
import { ErrorState } from "@/components/ui/error-state";
import { EmptyState } from "@/components/ui/empty-state";
import { useDatasetPreview } from "@/hooks/useAnalysis";
import { useCleaningRecommendations, useApplyCleaning } from "@/hooks/useCleaning";
import { motion } from "framer-motion";
import {
  Database,
  RefreshCw,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Merge,
  Filter,
  Wand2,
  ArrowRight,
  Brain,
  Info,
} from "lucide-react";

import type { CleaningAction } from "@/services/api";

function CleaningContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const datasetId = searchParams.get("dataset");

  const { data: preview, isLoading, error } = useDatasetPreview(datasetId);

  const { data: recsData } = useCleaningRecommendations(datasetId);
  const applyCleaning = useApplyCleaning();

  const recommendations: CleaningAction[] = recsData?.recommendations || [];

  usePageTitle("Data Cleaning");
  const [decisions, setDecisions] = useState<Record<string, "apply" | "skip" | "pending">>(() => {
    const initial: Record<string, "apply" | "skip" | "pending"> = {};
    recommendations.forEach((r) => { initial[r.id] = "pending"; });
    return initial;
  });
  const [applying, setApplying] = useState(false);
  const [complete, setComplete] = useState(false);

  // Reset decisions when recommendations arrive (useEffect, not setState-in-render)
  useEffect(() => {
    if (recommendations.length > 0) {
      const initial: Record<string, "apply" | "skip" | "pending"> = {};
      recommendations.forEach((r) => { initial[r.id] = "pending"; });
      setDecisions(initial);
    }
  }, [recommendations]);

  const setDecision = (id: string, decision: "apply" | "skip") => {
    setDecisions((prev) => ({ ...prev, [id]: decision }));
  };

  const handleApplyAll = () => {
    const newDecisions: Record<string, "apply" | "skip" | "pending"> = {};
    recommendations.forEach((r) => { newDecisions[r.id] = "apply"; });
    setDecisions(newDecisions);
  };

  const handleSkipAll = () => {
    const newDecisions: Record<string, "apply" | "skip" | "pending"> = {};
    recommendations.forEach((r) => { newDecisions[r.id] = "skip"; });
    setDecisions(newDecisions);
  };

  const handleExecute = async () => {
    setApplying(true);
    try {
      const decisionsPayload = Object.entries(decisions)
        .filter(([, d]) => d === "apply")
        .map(([action_id]) => ({ action_id, apply: true }));
      await applyCleaning.mutateAsync({ datasetId: datasetId!, decisions: decisionsPayload });
      setComplete(true);
    } catch {
      // Error toast handled by hook
    } finally {
      setApplying(false);
    }
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case "high": return "destructive";
      case "medium": return "warning";
      default: return "secondary";
    }
  };

  const counts = {
    apply: Object.values(decisions).filter((d) => d === "apply").length,
    skip: Object.values(decisions).filter((d) => d === "skip").length,
    pending: Object.values(decisions).filter((d) => d === "pending").length,
  };

  const categories = [
    { id: "missing_values", label: "Missing Values", icon: AlertTriangle },
    { id: "duplicates", label: "Duplicate Data", icon: Merge },
    { id: "outliers", label: "Outliers", icon: Filter },
    { id: "schema", label: "Schema Issues", icon: Info },
  ];

  // ── No Dataset ──
  if (!datasetId) {
    return (
      <AppShell>
        <div className="max-w-4xl mx-auto px-6 py-10">
          <EmptyState
            icon={Database}
            title="Select a dataset to clean"
            description="Choose a dataset to receive AI-powered cleaning recommendations. You decide which actions to apply."
            action={{ label: "Go to Datasets", onClick: () => router.push("/datasets") }}
          />
        </div>
      </AppShell>
    );
  }

  if (isLoading) {
    return (
      <AppShell>
        <div className="max-w-4xl mx-auto px-6 py-10">
          <LoadingScreen message="Analyzing data for cleaning recommendations..." />
        </div>
      </AppShell>
    );
  }

  if (error) {
    return (
      <AppShell>
        <div className="max-w-4xl mx-auto px-6 py-10">
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
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-bold">Data Cleaning</h1>
              {complete && <Badge variant="success">Cleaning Complete</Badge>}
            </div>
            <p className="text-sm text-muted-foreground">
              {preview?.filename || "Dataset"} &mdash; AI recommends cleaning actions. You decide what to apply.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleApplyAll}>
              <CheckCircle2 className="mr-1.5 h-4 w-4" />
              Select All
            </Button>
            <Button variant="outline" size="sm" onClick={handleSkipAll}>
              <XCircle className="mr-1.5 h-4 w-4" />
              Skip All
            </Button>
          </div>
        </div>

        {/* Summary bar */}
        <Card className="mb-8">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <Brain className="h-5 w-5 text-primary" strokeWidth={1.5} />
                </div>
                <div>
                  <p className="text-sm font-medium">
                    {recommendations.length} recommendations from AI
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {counts.apply} selected to apply &middot; {counts.skip} skipped &middot; {counts.pending} pending
                  </p>
                </div>
              </div>
              <div className="hidden sm:flex items-center gap-2">
                <Badge variant={counts.pending > 0 ? "warning" : "success"}>
                  {counts.pending > 0 ? `${counts.pending} pending` : "All reviewed"}
                </Badge>
              </div>
            </div>
            <Progress
              value={(counts.apply + counts.skip) / recommendations.length * 100}
              className="mt-3"
              size="sm"
            />
          </CardContent>
        </Card>

        {/* Success State */}
        {complete && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <Card className="border-emerald-500/30 bg-emerald-500/5">
              <CardContent className="p-8 text-center">
                <div className="flex flex-col items-center gap-3">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/10">
                    <CheckCircle2 className="h-8 w-8 text-emerald-500" strokeWidth={1.5} />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold mb-1">Cleaning Complete</h3>
                    <p className="text-sm text-muted-foreground max-w-md mx-auto">
                      {counts.apply} cleaning action{counts.apply !== 1 ? "s" : ""} applied successfully.
                      Your dataset has been updated.
                    </p>
                  </div>
                  <div className="flex gap-3 mt-2">
                    <Button onClick={() => router.push(`/analysis?dataset=${datasetId}`)}>
                      Continue to Analysis <ArrowRight className="ml-1.5 h-4 w-4" />
                    </Button>
                    <Button variant="outline" onClick={() => router.push(`/profiling?dataset=${datasetId}`)}>
                      View Updated Profile
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Recommendations by category */}
        {!complete && (
          <div className="space-y-6">
            {categories.map((cat) => {
              const catItems = recommendations.filter((r) => r.category === cat.id);
              if (catItems.length === 0) return null;
              const CatIcon = cat.icon;

              return (
                <Card key={cat.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-2">
                      <CatIcon className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
                      <CardTitle className="text-sm font-medium">{cat.label}</CardTitle>
                      <Badge variant="secondary" className="ml-1 text-[10px]">{catItems.length}</Badge>
                    </div>
                    <CardDescription className="text-xs">
                      {cat.id === "missing_values" && "Fill or remove values that are missing from your dataset"}
                      {cat.id === "duplicates" && "Remove or merge duplicated rows"}
                      {cat.id === "outliers" && "Handle statistical outliers that may skew analysis"}
                      {cat.id === "schema" && "Fix data type and formatting inconsistencies"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {catItems.map((rec) => {
                      const decision = decisions[rec.id] || "pending";

                      return (
                        <div
                          key={rec.id}
                          className={`rounded-lg border transition-all ${
                            decision === "apply"
                              ? "border-emerald-500/20 bg-emerald-500/5"
                              : decision === "skip"
                              ? "border-border/50 bg-muted/20 opacity-60"
                              : "border-border"
                          }`}
                        >
                          <div className="p-4">
                            <div className="flex items-start gap-4">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-sm font-medium">{rec.title}</span>
                                  <Badge variant={getImpactColor(rec.impact)} className="text-[10px]">
                                    {rec.impact} impact
                                  </Badge>
                                </div>
                                <p className="text-xs text-muted-foreground">{rec.description}</p>
                              </div>

                              <div className="flex items-center gap-2 shrink-0">
                                <Button
                                  size="sm"
                                  variant={decision === "apply" ? "default" : "outline"}
                                  className={`h-8 text-xs ${decision === "apply" ? "bg-emerald-600 hover:bg-emerald-700" : ""}`}
                                  onClick={() => setDecision(rec.id, "apply")}
                                >
                                  <CheckCircle2 className="mr-1 h-3 w-3" />
                                  Apply
                                </Button>
                                <Button
                                  size="sm"
                                  variant={decision === "skip" ? "secondary" : "outline"}
                                  className="h-8 text-xs"
                                  onClick={() => setDecision(rec.id, "skip")}
                                >
                                  <XCircle className="mr-1 h-3 w-3" />
                                  Skip
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
              );
            })}

            {/* Execute */}
            <div className="flex items-center justify-between p-4 rounded-xl bg-muted/30">
              <div className="flex items-center gap-3">
                <Wand2 className="h-5 w-5 text-primary" strokeWidth={1.5} />
                <div>
                  <p className="text-sm font-medium">
                    {counts.apply} action{counts.apply !== 1 ? "s" : ""} selected
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {counts.pending} action{counts.pending !== 1 ? "s" : ""} still pending review
                  </p>
                </div>
              </div>
              <Button
                size="lg"
                onClick={handleExecute}
                disabled={counts.apply === 0 || applying}
              >
                {applying ? (
                  <><RefreshCw className="mr-2 h-4 w-4 animate-spin" /> Applying...</>
                ) : counts.apply === 0 ? (
                  "Select actions to apply"
                ) : (
                  <><Wand2 className="mr-2 h-4 w-4" /> Apply {counts.apply} Action{counts.apply !== 1 ? "s" : ""}</>
                )}
              </Button>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}

export default function CleaningPage() {
  return (
    <Suspense fallback={
      <AppShell>
        <div className="max-w-5xl mx-auto px-6 py-10">
          <LoadingScreen message="Loading cleaning workspace..." />
        </div>
      </AppShell>
    }>
      <CleaningContent />
    </Suspense>
  );
}
