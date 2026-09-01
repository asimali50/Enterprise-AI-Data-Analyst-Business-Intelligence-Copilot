"use client";

import { Suspense, useEffect, useState } from "react";
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
import { useDatasetPreview } from "@/hooks/useAnalysis";
import { useAutomlInspect } from "@/hooks/useAutoml";
import {
  useTrainingModels,
  useRunTrainingPipeline,
  useTrainingRuns,
  useTrainingRun,
} from "@/hooks/useTraining";
import { motion, AnimatePresence } from "framer-motion";
import {
  Cpu,
  Clock,
  Gauge,
  History,
  Loader2,
  Rocket,
  Settings2,
  Table2,
  Trophy,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";

import type { TrainingModelInfo, TrainingModelResult, TrainingRunSummary } from "@/types";

const TASK_LABELS: Record<string, string> = {
  regression: "Regression",
  classification: "Classification",
};

const METRIC_LABELS: Record<string, string> = {
  accuracy: "Accuracy",
  precision: "Precision",
  recall: "Recall",
  f1: "F1",
  roc_auc: "ROC AUC",
  r2: "R²",
  rmse: "RMSE",
  mae: "MAE",
  mape: "MAPE",
};

const METRIC_ORDER: string[] = [
  "accuracy",
  "precision",
  "recall",
  "f1",
  "roc_auc",
  "r2",
  "rmse",
  "mae",
  "mape",
];

function ModelResultsTable({ run }: { run: { models: TrainingModelResult[]; best_model?: string | null } }) {
  const trained = run.models || [];
  if (trained.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-6 text-center">
        No models trained in this run.
      </p>
    );
  }

  // All metric keys present across the trained models, in canonical order.
  const metricKeys = METRIC_ORDER.filter((k) =>
    trained.some((m) => m.metrics && k in m.metrics),
  );

  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/40 text-left text-xs text-muted-foreground">
            <th className="px-3 py-2.5 font-medium">Model</th>
            <th className="px-3 py-2.5 font-medium text-right">Status</th>
            {metricKeys.map((k) => (
              <th key={k} className="px-3 py-2.5 font-medium text-right">
                {METRIC_LABELS[k] || k}
              </th>
            ))}
            <th className="px-3 py-2.5 font-medium text-right">Train&nbsp;(s)</th>
            <th className="px-3 py-2.5 font-medium text-right">Predict&nbsp;(s)</th>
            <th className="px-3 py-2.5 font-medium text-right">Mem&nbsp;(MB)</th>
          </tr>
        </thead>
        <tbody>
          {trained.map((m) => {
            const isBest = m.id === run.best_model;
            return (
              <tr
                key={m.id}
                className={`border-b last:border-0 ${
                  isBest ? "bg-emerald-500/5" : ""
                }`}
              >
                <td className="px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{m.name}</span>
                    {isBest && <Trophy className="h-3.5 w-3.5 text-emerald-500" />}
                  </div>
                </td>
                <td className="px-3 py-2.5 text-right">
                  <Badge variant={isBest ? "success" : "secondary"} className="text-[10px]">
                    {isBest ? "Best" : "Trained"}
                  </Badge>
                </td>
                {metricKeys.map((k) => {
                  const v = m.metrics?.[k];
                  return (
                    <td key={k} className="px-3 py-2.5 text-right tabular-nums text-muted-foreground">
                      {typeof v === "number" ? v.toFixed(4) : "—"}
                    </td>
                  );
                })}
                <td className="px-3 py-2.5 text-right tabular-nums text-muted-foreground">
                  {m.training_time_s.toFixed(2)}
                </td>
                <td className="px-3 py-2.5 text-right tabular-nums text-muted-foreground">
                  {m.prediction_time_s.toFixed(3)}
                </td>
                <td className="px-3 py-2.5 text-right tabular-nums text-muted-foreground">
                  {typeof m.memory_mb === "number" ? m.memory_mb.toFixed(1) : "—"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function TrainingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const datasetId = searchParams.get("dataset");

  const [activeTab, setActiveTab] = useState("setup");
  const [selectedTarget, setSelectedTarget] = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<string>("classification");
  const [selectedModels, setSelectedModels] = useState<Set<string>>(new Set());
  const [activeRunId, setActiveRunId] = useState<string | null>(null);

  const { data: preview } = useDatasetPreview(datasetId);
  const { data: inspect } = useAutomlInspect(datasetId);
  const { data: modelsData } = useTrainingModels(selectedTask);
  const runMutation = useRunTrainingPipeline();
  const { data: runsData } = useTrainingRuns(datasetId);
  const { data: activeRun } = useTrainingRun(datasetId, activeRunId);

  usePageTitle("Model Training");

  // Populate the model checklist whenever the catalog (re)loads for a task.
  const modelCatalog: TrainingModelInfo[] =
    (modelsData?.models || modelsData?.classification || []) as TrainingModelInfo[];

  useEffect(() => {
    if (modelCatalog.length > 0) {
      setSelectedModels(new Set(modelCatalog.filter((m) => m.available).map((m) => m.id)));
    }
  }, [selectedTask, modelCatalog]);

  // ── No Dataset ──
  if (!datasetId) {
    return (
      <AppShell>
        <div className="max-w-5xl mx-auto px-6 py-10">
          <EmptyState
            icon={Cpu}
            title="Select a dataset to train models"
            description="Run the multi-model training pipeline — Random Forest, XGBoost, LightGBM, CatBoost, Decision Tree, Logistic/Linear Regression, SVM, KNN, Naive Bayes — and compare metrics, runtime, and memory."
            action={{ label: "Go to Datasets", onClick: () => router.push("/datasets") }}
          />
        </div>
      </AppShell>
    );
  }

  if (!preview) {
    return (
      <AppShell>
        <div className="max-w-5xl mx-auto px-6 py-10">
          <LoadingScreen message="Loading dataset for training..." />
        </div>
      </AppShell>
    );
  }

  const candidates = inspect?.candidate_targets || [];
  const targetOptions = candidates.map((c) => ({ value: c.column, label: c.column }));
  const availableCount = modelCatalog.filter((m) => m.available).length;
  const runs: TrainingRunSummary[] = runsData?.runs || [];

  const toggleModel = (id: string) => {
    setSelectedModels((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleRun = () => {
    if (!datasetId || selectedModels.size === 0) return;
    runMutation.mutateAsync({
      dataset_id: datasetId,
      target: selectedTarget ?? inspect?.recommendation?.target ?? undefined,
      task: selectedTask,
      models: Array.from(selectedModels),
    }).then((data) => {
      if (data.success && data.run_id) {
        setActiveTab("results");
        setActiveRunId(data.run_id);
      }
    }).catch(() => {
      // Error toast handled by hook
    });
  };

  return (
    <AppShell>
      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold">Model Training</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {preview?.filename} &mdash; auto-train compatible models and compare
              accuracy, precision, recall, F1, ROC AUC, time and memory
            </p>
          </div>
        </div>

        {/* Tabs */}
        <Tabs
          tabs={[
            {
              id: "setup",
              label: "Setup",
              icon: <Settings2 className="h-4 w-4" />,
            },
            {
              id: "results",
              label: "Results",
              icon: <Table2 className="h-4 w-4" />,
              badge: runMutation.data?.models?.length,
            },
            {
              id: "history",
              label: "History",
              icon: <History className="h-4 w-4" />,
              badge: runs.length || undefined,
            },
          ]}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          className="mb-8"
        />

        {/* ── Setup ── */}
        {activeTab === "setup" && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Configuration</CardTitle>
                <CardDescription className="text-xs">
                  Choose the target, task, and models to train
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">
                      Target column
                    </label>
                    <Select
                      value={selectedTarget ?? inspect?.recommendation?.target ?? ""}
                      placeholder="Auto-detect"
                      options={targetOptions}
                      onChange={(e) => setSelectedTarget(e.target.value || null)}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">
                      Task
                    </label>
                    <Select
                      value={selectedTask}
                      options={Object.entries(TASK_LABELS).map(([value, label]) => ({
                        value,
                        label,
                      }))}
                      onChange={(e) => setSelectedTask(e.target.value)}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between rounded-lg bg-muted/30 p-3 text-sm">
                  <div className="flex items-center gap-2">
                    <Gauge className="h-4 w-4 text-primary" strokeWidth={1.5} />
                    <span>
                      {preview?.num_rows?.toLocaleString()} rows · {preview?.num_columns} columns
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-primary" strokeWidth={1.5} />
                    <span>Train + predict + memory per model</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Model checklist */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-sm font-medium">Models</CardTitle>
                    <CardDescription className="text-xs">
                      {availableCount} of {modelCatalog.length} available for {TASK_LABELS[selectedTask] || selectedTask}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedModels(new Set(modelCatalog.filter((m) => m.available).map((m) => m.id)))}
                    >
                      Select all
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedModels(new Set())}
                    >
                      Clear
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {modelCatalog.length === 0 && (
                  <div className="rounded-lg bg-destructive/5 border border-destructive/20 p-4">
                    <div className="flex items-center gap-2 text-sm font-medium text-destructive">
                      <AlertTriangle className="h-4 w-4" />
                      scikit-learn is not installed
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      Run <code className="rounded bg-muted px-1">pip install scikit-learn</code> in the
                      backend environment, then reload this page.
                    </p>
                  </div>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {modelCatalog.map((m) => {
                    const checked = selectedModels.has(m.id);
                    const selectable = m.available;
                    return (
                      <button
                        key={m.id}
                        disabled={!selectable}
                        onClick={() => toggleModel(m.id)}
                        className={`rounded-lg border p-3 text-left transition-all ${
                          checked
                            ? "border-primary/30 bg-primary/5"
                            : selectable
                            ? "hover:border-border/80"
                            : "opacity-50 cursor-not-allowed"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                            checked ? "bg-primary border-primary" : "border-border"
                          }`}>
                            {checked && <CheckCircle2 className="h-3 w-3 text-primary-foreground" />}
                          </span>
                          <span className="text-sm font-medium">{m.name}</span>
                          {m.id === "random_forest" && (
                            <Badge variant="success" className="text-[10px]">Recommended</Badge>
                          )}
                        </div>
                        {!selectable && m.reason && (
                          <p className="mt-1 text-xs text-muted-foreground">{m.reason}</p>
                        )}
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Run */}
            <div className="flex items-center justify-between p-4 rounded-xl bg-muted/30">
              <div className="flex items-center gap-3">
                <Rocket className="h-5 w-5 text-primary" strokeWidth={1.5} />
                <div>
                  <p className="text-sm font-medium">
                    {selectedModels.size} model{selectedModels.size !== 1 ? "s" : ""} selected
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Target: {selectedTarget ?? inspect?.recommendation?.target ?? "auto-detect"}
                  </p>
                </div>
              </div>
              <Button
                size="lg"
                onClick={handleRun}
                disabled={selectedModels.size === 0 || runMutation.isPending}
              >
                {runMutation.isPending ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Training…</>
                ) : (
                  <><Rocket className="mr-2 h-4 w-4" /> Run Training</>
                )}
              </Button>
            </div>
          </motion.div>
        )}

        {/* ── Results ── */}
        {activeTab === "results" && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            {runMutation.isPending && (
              <Card className="border-primary/20">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3">
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                    <div>
                      <p className="text-sm font-medium">Training {selectedModels.size} models…</p>
                      <p className="text-xs text-muted-foreground">
                        This may take a moment depending on dataset size.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {runMutation.data && !runMutation.isPending && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                {runMutation.data.success ? (
                  <>
                    <Card className="border-emerald-500/30 bg-emerald-500/5">
                      <CardContent className="p-6 flex items-start gap-4">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10">
                          <Trophy className="h-6 w-6 text-emerald-500" strokeWidth={1.5} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold mb-1">
                            Best model: {runMutation.data.best_model_name}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {runMutation.data.primary_metric} score:{" "}
                            {typeof runMutation.data.best_score === "number"
                              ? runMutation.data.best_score.toFixed(4)
                              : "—"}
                            {" "}· {runMutation.data.n_rows} rows · {runMutation.data.n_features} features
                          </p>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium">Per-model metrics</CardTitle>
                        <CardDescription className="text-xs">
                          Accuracy, precision, recall, F1, ROC AUC (classification) or R², RMSE, MAE, MAPE (regression) + time + memory
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <ModelResultsTable run={runMutation.data as unknown as { models: TrainingModelResult[]; best_model?: string | null }} />
                      </CardContent>
                    </Card>
                  </>
                ) : (
                  <Card className="border-destructive/30 bg-destructive/5">
                    <CardContent className="p-6 flex items-start gap-4">
                      <AlertTriangle className="h-6 w-6 text-destructive shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-semibold mb-1">
                          {runMutation.data.code === "SKLEARN_MISSING"
                            ? "scikit-learn not installed"
                            : "Training failed"}
                        </p>
                        <p className="text-sm text-muted-foreground">{runMutation.data.error}</p>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </motion.div>
            )}

            {!runMutation.data && !runMutation.isPending && (
              <div className="rounded-lg border border-dashed p-10 text-center">
                <Cpu className="h-8 w-8 mx-auto text-muted-foreground mb-2" strokeWidth={1.5} />
                <p className="text-sm text-muted-foreground">
                  Run a training job from the Setup tab to see results.
                </p>
              </div>
            )}
          </motion.div>
        )}

        {/* ── History ── */}
        {activeTab === "history" && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            {runs.length === 0 && (
              <div className="rounded-lg border border-dashed p-10 text-center">
                <History className="h-8 w-8 mx-auto text-muted-foreground mb-2" strokeWidth={1.5} />
                <p className="text-sm text-muted-foreground">
                  No training runs for this dataset yet.
                </p>
              </div>
            )}
            {runs.map((run) => {
              const isOpen = activeRunId === run.run_id;
              return (
                <Card key={run.run_id} className={isOpen ? "border-primary/30" : ""}>
                  <button
                    className="w-full text-left p-4 flex items-center justify-between gap-3"
                    onClick={() => {
                      setActiveRunId(isOpen ? null : run.run_id);
                    }}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                        <History className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium">
                          {run.best_model || "—"}
                          <Badge variant="secondary" className="ml-2 text-[10px]">
                            {TASK_LABELS[run.task] || run.task}
                          </Badge>
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {run.target || "auto"} · {run.primary_metric} · {run.n_rows} rows
                          {run.created_at ? ` · ${new Date(run.created_at).toLocaleString()}` : ""}
                        </p>
                      </div>
                    </div>
                    <ChevronIcon open={isOpen} />
                  </button>
                  <AnimatePresence>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <CardContent className="pt-0">
                          {activeRun ? (
                            <ModelResultsTable run={activeRun} />
                          ) : (
                            <p className="text-sm text-muted-foreground py-4">Loading run…</p>
                          )}
                        </CardContent>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </Card>
              );
            })}
          </motion.div>
        )}
      </div>
    </AppShell>
  );
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${open ? "rotate-90" : ""}`}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}

export default function TrainingPage() {
  return (
    <Suspense fallback={
      <AppShell>
        <div className="max-w-6xl mx-auto px-6 py-10">
          <LoadingScreen message="Loading Model Training..." />
        </div>
      </AppShell>
    }>
      <TrainingContent />
    </Suspense>
  );
}
