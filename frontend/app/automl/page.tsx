"use client";

import { Suspense, useState } from "react";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useRouter, useSearchParams } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
import { Tabs } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { LoadingScreen } from "@/components/ui/loading-screen";
import { ErrorState } from "@/components/ui/error-state";
import { EmptyState } from "@/components/ui/empty-state";
import {
  useAutomlInspect,
  useAutomlRecommendations,
  useTrainAutomlModel,
} from "@/hooks/useAutoml";
import { motion } from "framer-motion";
import {
  BrainCircuit,
  Gauge,
  Rocket,
  ScanSearch,
  Cpu,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  Table2,
  ArrowRight,
} from "lucide-react";

import type { AutoMLTask, AutoMLModel, DetectedTask, CandidateTarget } from "@/types";

const TASK_LABELS: Record<AutoMLTask, string> = {
  regression: "Regression",
  classification: "Classification",
  clustering: "Clustering",
  time_series: "Time Series",
};

const TIER_VARIANT: Record<AutoMLModel["tier"], "default" | "success" | "secondary" | "warning"> = {
  recommended: "success",
  specialist: "warning",
  baseline: "secondary",
  alternative: "secondary",
};

function AutoMLContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const datasetId = searchParams.get("dataset");

  const [activeTab, setActiveTab] = useState("overview");
  const [selectedTarget, setSelectedTarget] = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<AutoMLTask | null>(null);
  const [trainModelId, setTrainModelId] = useState<string | null>(null);

  const { data: inspect, isLoading, error } = useAutomlInspect(datasetId);
  const { data: rec, isFetching: recFetching } = useAutomlRecommendations(
    datasetId,
    selectedTarget,
    selectedTask,
  );
  const trainMutation = useTrainAutomlModel();

  usePageTitle("AutoML Studio");

  const handleRunModels = () => {
    setActiveTab("models");
  };

  // ── No Dataset ──
  if (!datasetId) {
    return (
      <AppShell>
        <div className="max-w-5xl mx-auto px-6 py-10">
          <EmptyState
            icon={BrainCircuit}
            title="Select a dataset for AutoML"
            description="Inspect your dataset, detect the ML task, and get data-driven model recommendations with an optional quick train."
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
          <LoadingScreen message="Inspecting dataset for modeling potential..." />
        </div>
      </AppShell>
    );
  }

  if (error) {
    return (
      <AppShell>
        <div className="max-w-5xl mx-auto px-6 py-10">
          <ErrorState title="Failed to inspect dataset" onBack={() => router.push("/datasets")} />
        </div>
      </AppShell>
    );
  }

  const tasks = inspect?.detected_tasks || [];
  const candidates = inspect?.candidate_targets || [];

  // Model rows for training: recommendable + trainable, default to the top pick.
  const trainableModels = (rec?.models || []).filter((m) => m.trainable);
  const effectiveTrainModel =
    trainModelId ?? rec?.recommended_model ?? trainableModels[0]?.id ?? null;
  const trainTask: AutoMLTask = rec?.task ?? "regression";

  return (
    <AppShell>
      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-bold">AutoML Studio</h1>
              <Badge variant="default">Beta</Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {inspect?.filename} &mdash; {inspect?.summary}
            </p>
          </div>
          <Button size="lg" onClick={handleRunModels}>
            <Rocket className="mr-2 h-4 w-4" /> Recommend Models
          </Button>
        </div>

        {/* Recommended path */}
        {inspect?.recommendation?.task && (
          <Card className="mb-8 border-primary/20 bg-primary/[0.03]">
            <CardContent className="p-5">
              <div className="flex items-start gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                  <BrainCircuit className="h-6 w-6 text-primary" strokeWidth={1.5} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold mb-1">
                    Detected:{" "}
                    {inspect.recommendation.task
                      ? TASK_LABELS[inspect.recommendation.task]
                      : "—"}
                    {inspect.recommendation.target && (
                      <> &mdash; predict &ldquo;{inspect.recommendation.target}&rdquo;</>
                    )}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {inspect.recommendation.message}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tab bar */}
        <Tabs
          tabs={[
            { id: "overview", label: "Overview", icon: <ScanSearch className="h-4 w-4" /> },
            {
              id: "models",
              label: "Model Recommendations",
              icon: <Cpu className="h-4 w-4" />,
              badge: rec?.models?.length ?? undefined,
            },
            { id: "train", label: "Quick Train", icon: <Rocket className="h-4 w-4" /> },
          ]}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          className="mb-8"
        />

        {/* ── Overview ── */}
        {activeTab === "overview" && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            {/* Data quality + shape */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Card>
                <CardContent className="p-5">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                      <Table2 className="h-5 w-5 text-muted-foreground" strokeWidth={1.5} />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Shape</p>
                      <p className="text-lg font-semibold">
                        {inspect?.shape.rows.toLocaleString()} × {inspect?.shape.columns}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-5">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                      <Gauge className="h-5 w-5 text-muted-foreground" strokeWidth={1.5} />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Data Health</p>
                      <p className="text-lg font-semibold">
                        {inspect?.data_quality.health_score.toFixed(0)} / 100
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-5">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                      <AlertTriangle className="h-5 w-5 text-muted-foreground" strokeWidth={1.5} />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Missing Values</p>
                      <p className="text-lg font-semibold">
                        {inspect?.data_quality.total_missing.toLocaleString()}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Detected tasks */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Detected ML Tasks</CardTitle>
                <CardDescription className="text-xs">
                  Auto-detected from column roles and target suitability
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {tasks.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    No strong labeled target detected. Consider clustering or adding more features.
                  </p>
                )}
                {tasks.map((t: DetectedTask) => (
                  <div key={t.task} className="flex items-center gap-4 rounded-lg border p-3">
                    <Badge variant="default" className="shrink-0">
                      {TASK_LABELS[t.task]}
                    </Badge>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-muted-foreground">
                        {t.target ? `target: ${t.target}` : "no labeled target"}
                        {t.time_column ? ` · time: ${t.time_column}` : ""}
                      </p>
                      <p className="text-xs text-muted-foreground/80">{t.reason}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs font-medium">
                        {(t.confidence * 100).toFixed(0)}%
                      </span>
                      <Progress value={t.confidence * 100} className="w-20" size="sm" />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Candidate targets */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Candidate Target Columns</CardTitle>
                <CardDescription className="text-xs">
                  Ranked by suitability as a prediction target
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {candidates.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    No viable target columns detected.
                  </p>
                )}
                {candidates.map((c: CandidateTarget) => (
                  <div
                    key={c.column}
                    className="flex items-center gap-4 rounded-lg border p-3"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">
                        {c.column}
                        <Badge variant="secondary" className="ml-2 text-[10px]">
                          {c.role}
                        </Badge>
                      </p>
                      <p className="text-xs text-muted-foreground">{c.reason}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs font-medium">
                        {(c.suitability * 100).toFixed(0)}%
                      </span>
                      <Progress value={c.suitability * 100} className="w-20" size="sm" />
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 text-xs shrink-0"
                      onClick={() => {
                        setSelectedTarget(c.column);
                        setSelectedTask(c.task);
                        setActiveTab("models");
                      }}
                    >
                      Use as target <ArrowRight className="ml-1 h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* ── Models ── */}
        {activeTab === "models" && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            {/* Controls */}
            <Card>
              <CardContent className="p-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">
                      Target column
                    </label>
                    <Select
                      value={selectedTarget ?? ""}
                      placeholder="Auto-detect"
                      options={[
                        { value: "", label: "Auto-detect" },
                        ...candidates.map((c) => ({
                          value: c.column,
                          label: `${c.column} (${TASK_LABELS[c.task]})`,
                        })),
                      ]}
                      onChange={(e) => setSelectedTarget(e.target.value || null)}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">
                      Task
                    </label>
                    <Select
                      value={selectedTask ?? ""}
                      placeholder="Auto-detect"
                      options={[
                        { value: "", label: "Auto-detect" },
                        ...Object.entries(TASK_LABELS).map(([value, label]) => ({
                          value,
                          label,
                        })),
                      ]}
                      onChange={(e) =>
                        setSelectedTask((e.target.value as AutoMLTask) || null)
                      }
                    />
                  </div>
                  <div className="sm:text-right">
                    {recFetching ? (
                      <span className="text-xs text-muted-foreground inline-flex items-center gap-1.5">
                        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Re-scoring…
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        {rec?.n_rows?.toLocaleString()} rows · {rec?.n_features} features
                      </span>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Why top */}
            {rec?.why_top && (
              <Card className="border-primary/20 bg-primary/[0.03]">
                <CardContent className="p-5 flex items-start gap-3">
                  <BrainCircuit className="h-5 w-5 text-primary shrink-0 mt-0.5" strokeWidth={1.5} />
                  <p className="text-sm">{rec.why_top}</p>
                </CardContent>
              </Card>
            )}

            {/* Performance estimate */}
            {rec?.performance_estimate && (
              <Card>
                <CardContent className="p-5">
                  <div className="flex items-center gap-4">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-muted">
                      <TrendingUp className="h-5 w-5 text-muted-foreground" strokeWidth={1.5} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">
                        Expected performance: {rec.performance_estimate.quality} (
                        {(rec.performance_estimate.score * 100).toFixed(0)}%)
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {rec.performance_estimate.disclaimer}
                      </p>
                    </div>
                    <div className="hidden sm:flex flex-wrap gap-1.5 justify-end max-w-sm">
                      {rec.performance_estimate.factors.map((f) => (
                        <Badge key={f} variant="secondary" className="text-[10px]">
                          {f}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Model ranking */}
            <div className="space-y-4">
              {(rec?.models || []).map((m: AutoMLModel) => (
                <Card
                  key={m.id}
                  className={`transition-all ${
                    m.rank === 1 ? "border-primary/30 bg-primary/[0.02]" : ""
                  }`}
                >
                  <CardContent className="p-5">
                    <div className="flex items-start gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-semibold">
                            {m.rank}. {m.name}
                          </span>
                          <Badge variant={TIER_VARIANT[m.tier]} className="text-[10px]">
                            {m.tier}
                          </Badge>
                          {m.requires && (
                            <Badge variant="secondary" className="text-[10px]">
                              {m.requires}
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mb-2">
                          {m.family} · {m.metrics.join(" · ")}
                        </p>
                        <p className="text-xs text-muted-foreground mb-3">{m.best_for}</p>
                        <div className="flex flex-wrap gap-1.5">
                          {m.tags.map((t) => (
                            <Badge key={t} variant="secondary" className="text-[10px]">
                              {t}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-2xl font-bold">{m.score}</span>
                        <div className="flex flex-col items-start gap-1">
                          <span className="text-[10px] text-muted-foreground leading-none">
                            match
                          </span>
                          <Progress value={m.score} className="w-24" size="sm" />
                        </div>
                      </div>
                    </div>

                    {/* Why points */}
                    {m.why.length > 0 && (
                      <div className="mt-3 rounded-lg bg-muted/30 p-3">
                        <p className="text-xs font-medium text-muted-foreground mb-1.5">
                          Why it fits
                        </p>
                        <ul className="space-y-1">
                          {m.why.map((w, i) => (
                            <li key={i} className="text-xs text-muted-foreground flex gap-2">
                              <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                              <span>{w}</span>
                            </li>
                          ))}
                        </ul>
                        {m.tradeoffs && (
                          <p className="text-xs text-muted-foreground/70 mt-1.5">
                            <span className="font-medium">Tradeoff:</span> {m.tradeoffs}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Capability breakdown */}
                    {Object.keys(m.capability_breakdown || {}).length > 0 && (
                      <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2">
                        {Object.values(m.capability_breakdown).map((cb) => (
                          <div key={cb.label} className="flex items-center gap-2">
                            <span className="text-[10px] text-muted-foreground flex-1 truncate">
                              {cb.label}
                            </span>
                            <Progress value={cb.score} className="w-16" size="sm" />
                            <span className="text-[10px] font-medium w-6 text-right">
                              {cb.score}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </motion.div>
        )}

        {/* ── Train ── */}
        {activeTab === "train" && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Quick Train</CardTitle>
                <CardDescription className="text-xs">
                  Train a validation model on the target and see held-out metrics.
                  Requires scikit-learn in the backend.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">
                      Model
                    </label>
                    <Select
                      value={effectiveTrainModel ?? ""}
                      options={trainableModels.map((m) => ({
                        value: m.id,
                        label: `${m.name} (${m.score})`,
                      }))}
                      onChange={(e) => setTrainModelId(e.target.value || null)}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">
                      Target
                    </label>
                    <Select
                      value={selectedTarget ?? rec?.target ?? ""}
                      placeholder="Auto-detect"
                      options={[
                        { value: "", label: "Auto-detect" },
                        ...candidates.map((c) => ({ value: c.column, label: c.column })),
                      ]}
                      onChange={(e) => setSelectedTarget(e.target.value || null)}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">
                      Task
                    </label>
                    <Select
                      value={trainTask}
                      options={Object.entries(TASK_LABELS)
                        .filter(([v]) => v === "regression" || v === "classification")
                        .map(([value, label]) => ({ value, label }))}
                      onChange={(e) => setSelectedTask(e.target.value as AutoMLTask)}
                    />
                  </div>
                </div>

                <Button
                  size="lg"
                  onClick={() =>
                    trainMutation.mutateAsync({
                      dataset_id: datasetId,
                      target: selectedTarget ?? rec?.target ?? "",
                      task: trainTask,
                      model_id: effectiveTrainModel ?? undefined,
                    })
                  }
                  disabled={
                    trainMutation.isPending ||
                    !effectiveTrainModel ||
                    !(selectedTarget ?? rec?.target)
                  }
                >
                  {trainMutation.isPending ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Training…</>
                  ) : (
                    <><Rocket className="mr-2 h-4 w-4" /> Train Model</>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Training result */}
            {trainMutation.data && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                {trainMutation.data.success ? (
                  <Card className="border-emerald-500/30 bg-emerald-500/5">
                    <CardContent className="p-6">
                      <div className="flex items-start gap-4">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10">
                          <CheckCircle2 className="h-6 w-6 text-emerald-500" strokeWidth={1.5} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold mb-1">
                            Trained {trainMutation.data.model_name} —{" "}
                            {trainMutation.data.message}
                          </p>
                          <div className="flex flex-wrap gap-2 mt-2">
                            {Object.entries(trainMutation.data.metrics || {}).map(
                              ([k, v]) => (
                                <div
                                  key={k}
                                  className="rounded-lg border px-3 py-1.5 bg-background"
                                >
                                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
                                    {k}
                                  </p>
                                  <p className="text-sm font-semibold">
                                    {typeof v === "number" ? v.toFixed(4) : v}
                                  </p>
                                </div>
                              ),
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-3">
                            {trainMutation.data.n_train} train ·{" "}
                            {trainMutation.data.n_test} test ·{" "}
                            {trainMutation.data.features_used} features · scoring:{" "}
                            {trainMutation.data.scoring}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <Card className="border-destructive/30 bg-destructive/5">
                    <CardContent className="p-6 flex items-start gap-4">
                      <AlertTriangle className="h-6 w-6 text-destructive shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-semibold mb-1">
                          {trainMutation.data.code === "SKLEARN_MISSING"
                            ? "scikit-learn not installed"
                            : "Training failed"}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {trainMutation.data.error}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </motion.div>
            )}
          </motion.div>
        )}
      </div>
    </AppShell>
  );
}

export default function AutoMLPage() {
  return (
    <Suspense fallback={
      <AppShell>
        <div className="max-w-6xl mx-auto px-6 py-10">
          <LoadingScreen message="Loading AutoML Studio..." />
        </div>
      </AppShell>
    }>
      <AutoMLContent />
    </Suspense>
  );
}
