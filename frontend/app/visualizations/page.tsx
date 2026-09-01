"use client";

import { Suspense, useState } from "react";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useRouter, useSearchParams } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Tabs } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { LoadingScreen } from "@/components/ui/loading-screen";
import { ErrorState } from "@/components/ui/error-state";
import { EmptyState } from "@/components/ui/empty-state";
import { useDatasetPreview } from "@/hooks/useAnalysis";
import { useGenerateChart } from "@/hooks/useVisualizations";
import { ChartCard } from "@/components/dashboard/ChartCard";
import { motion, AnimatePresence } from "framer-motion";
import {
  BarChart3,
  Database,
  RefreshCw,
  CheckCircle2,
  Palette,
  Filter,
  Hash,
  Play,
  Loader2,
  PieChart,
  TrendingUp,
  ScatterChart,
  LayoutGrid,
  LineChart,
  Activity,
  Plus,
  X,
  Save,
  Image,
  Trash2,
} from "lucide-react";

const CHART_TYPES = [
  { id: "bar", label: "Bar Chart", icon: BarChart3 },
  { id: "line", label: "Line Chart", icon: TrendingUp },
  { id: "scatter", label: "Scatter Plot", icon: ScatterChart },
  { id: "pie", label: "Pie Chart", icon: PieChart },
  { id: "area", label: "Area Chart", icon: Activity },
  { id: "heatmap", label: "Heatmap", icon: LayoutGrid },
  { id: "histogram", label: "Histogram", icon: Hash },
  { id: "box", label: "Box Plot", icon: BarChart3 },
];

const AGGREGATIONS = [
  { value: "none", label: "None (raw)" },
  { value: "sum", label: "Sum" },
  { value: "avg", label: "Average" },
  { value: "count", label: "Count" },
  { value: "min", label: "Minimum" },
  { value: "max", label: "Maximum" },
  { value: "median", label: "Median" },
  { value: "std", label: "Std Deviation" },
];

const COLOR_SCHEMES = [
  { value: "default", label: "Default (Primary)" },
  { value: "monochrome", label: "Monochrome" },
  { value: "gradient", label: "Gradient" },
  { value: "categorical", label: "Categorical" },
  { value: "sequential", label: "Sequential" },
  { value: "diverging", label: "Diverging" },
];

const MOCK_COLUMNS = [
  "revenue", "quantity", "price", "discount", "profit",
  "customer_age", "transaction_date", "region", "category",
  "product_name", "customer_id", "order_status",
];

interface ChartConfig {
  chartType: string;
  xAxis: string;
  yAxis: string;
  aggregation: string;
  colorScheme: string;
  filters: { column: string; operator: string; value: string }[];
  title: string;
}

interface SavedChart {
  id: string;
  config: ChartConfig;
  generatedAt: string;
  spec?: {
    data: Record<string, unknown>[];
    layout: Record<string, unknown>;
  };
}

function VisualizationContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const datasetId = searchParams.get("dataset");

  const { data: preview, isLoading, error } = useDatasetPreview(datasetId);

  const [config, setConfig] = useState<ChartConfig>({
    chartType: "bar",
    xAxis: "",
    yAxis: "",
    aggregation: "none",
    colorScheme: "default",
    filters: [],
    title: "",
  });
  usePageTitle("Visualization Studio");
  const [generating, setGenerating] = useState(false);
  const [generatedCharts, setGeneratedCharts] = useState<SavedChart[]>([]);
  const [activeView, setActiveView] = useState<"builder" | "gallery">("builder");
  const generateChartMutation = useGenerateChart();

  const columns = preview?.columns.map((c) => c.name) || MOCK_COLUMNS;

  const updateConfig = (key: keyof ChartConfig, value: any) => {
    setConfig((prev) => ({ ...prev, [key]: value }));
  };

  const addFilter = () => {
    setConfig((prev) => ({
      ...prev,
      filters: [...prev.filters, { column: columns[0] || "", operator: "equals", value: "" }],
    }));
  };

  const updateFilter = (index: number, field: string, value: string) => {
    setConfig((prev) => {
      const newFilters = [...prev.filters];
      newFilters[index] = { ...newFilters[index], [field]: value };
      return { ...prev, filters: newFilters };
    });
  };

  const removeFilter = (index: number) => {
    setConfig((prev) => ({
      ...prev,
      filters: prev.filters.filter((_, i) => i !== index),
    }));
  };

  const handleGenerate = async () => {
    if (!config.xAxis || !config.yAxis || !datasetId) return;
    setGenerating(true);

    try {
      const result = await generateChartMutation.mutateAsync({
        datasetId,
        config,
      });
      const newChart: SavedChart = {
        id: `${result.chart_id}-${Date.now()}`,
        config: { ...config },
        generatedAt: new Date().toISOString(),
        spec: {
          data: result.data,
          layout: result.layout,
        },
      };
      setGeneratedCharts((prev) => [newChart, ...prev]);
    } catch {
      // Error toast handled by hook
    } finally {
      setGenerating(false);
    }
  };

  // Some chart types only need a single axis (pie, histogram, heatmap).
  // Bar/line/scatter/area/box need both.
  const singleAxisTypes = ["pie", "histogram", "heatmap"];
  const needsY = !singleAxisTypes.includes(config.chartType);
  const canGenerate = needsY
    ? !!config.xAxis && !!config.yAxis
    : !!config.xAxis;

  // ── No Dataset ──
  if (!datasetId) {
    return (
      <AppShell>
        <div className="max-w-5xl mx-auto px-6 py-10">
          <EmptyState
            icon={BarChart3}
            title="Select a dataset to visualize"
            description="Choose a dataset and build charts by selecting chart type, axes, aggregation, and filters — all under your control."
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
          <LoadingScreen message="Loading dataset for visualization..." />
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
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold">Visualization Studio</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {preview?.filename} &mdash; You choose the chart type, axes, and styling. AI generates the chart on demand.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant={activeView === "builder" ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveView("builder")}
            >
              Chart Builder
            </Button>
            <Button
              variant={activeView === "gallery" ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveView("gallery")}
            >
              Gallery ({generatedCharts.length})
            </Button>
          </div>
        </div>

        {activeView === "gallery" && generatedCharts.length === 0 && (
          <EmptyState
            icon={Image}
            title="No charts generated yet"
            description="Switch to Chart Builder to create your first visualization."
            action={{ label: "Chart Builder", onClick: () => setActiveView("builder") }}
          />
        )}

        {activeView === "gallery" && generatedCharts.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {generatedCharts.map((chart) => (
              <Card key={chart.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-sm font-medium">
                        {chart.config.title || `${chart.config.chartType} chart`}
                      </CardTitle>
                      <CardDescription className="text-xs mt-0.5">
                        {chart.config.chartType} &middot; X: {chart.config.xAxis} &middot; Y: {chart.config.yAxis}
                        {chart.config.aggregation !== "none" && ` &middot; ${chart.config.aggregation}`}
                      </CardDescription>
                    </div>
                    <Badge variant="secondary" className="text-[10px]">
                      {new Date(chart.generatedAt).toLocaleTimeString()}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  {chart.spec?.data?.length ? (
                    <ChartCard
                      chart={{
                        chart_id: chart.id,
                        title: chart.config.title || `${chart.config.chartType} chart`,
                        chart_type: chart.config.chartType,
                        data: chart.spec.data,
                        layout: chart.spec.layout,
                        config: {},
                      }}
                    />
                  ) : (
                    <div className="h-48 rounded-lg bg-gradient-to-br from-primary/5 to-primary/10 flex items-center justify-center">
                      <div className="text-center">
                        <BarChart3 className="h-8 w-8 text-primary/40 mx-auto mb-2" strokeWidth={1.5} />
                        <p className="text-xs text-muted-foreground">Chart data unavailable</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {activeView === "builder" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* ── Chart Builder ── */}
            <div className="lg:col-span-2 space-y-6">
              {/* Chart Type Selector */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Chart Type</CardTitle>
                  <CardDescription className="text-xs">Choose the visualization type for your data</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                    {CHART_TYPES.map((ct) => {
                      const Icon = ct.icon;
                      const selected = config.chartType === ct.id;
                      return (
                        <button
                          key={ct.id}
                          onClick={() => updateConfig("chartType", ct.id)}
                          className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border text-xs transition-all ${
                            selected
                              ? "border-primary bg-primary/10 text-primary"
                              : "border-border hover:border-primary/30 hover:bg-muted"
                          }`}
                        >
                          <Icon className="h-5 w-5" strokeWidth={selected ? 2.5 : 1.5} />
                          <span className="font-medium">{ct.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* Axis Configuration */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Axis Configuration</CardTitle>
                  <CardDescription className="text-xs">Select the columns for X and Y axes</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-muted-foreground">X Axis</label>
                      <Select
                        options={columns.map((c) => ({ value: c, label: c }))}
                        placeholder="Select column..."
                        value={config.xAxis}
                        onChange={(e) => updateConfig("xAxis", e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-muted-foreground">Y Axis</label>
                      <Select
                        options={columns.map((c) => ({ value: c, label: c }))}
                        placeholder="Select column..."
                        value={config.yAxis}
                        onChange={(e) => updateConfig("yAxis", e.target.value)}
                      />
                    </div>
                  </div>

                  <Separator />

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-muted-foreground">Aggregation</label>
                      <Select
                        options={AGGREGATIONS}
                        value={config.aggregation}
                        onChange={(e) => updateConfig("aggregation", e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-muted-foreground">Color Scheme</label>
                      <Select
                        options={COLOR_SCHEMES}
                        value={config.colorScheme}
                        onChange={(e) => updateConfig("colorScheme", e.target.value)}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Filters */}
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-sm font-medium">Filters</CardTitle>
                      <CardDescription className="text-xs">Filter data before chart generation (optional)</CardDescription>
                    </div>
                    <Button variant="outline" size="sm" onClick={addFilter}>
                      <Plus className="mr-1 h-3 w-3" /> Add Filter
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {config.filters.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No filters applied. All data will be included in the chart.
                    </p>
                  )}
                  {config.filters.map((filter, i) => (
                    <div key={i} className="flex items-center gap-2 p-3 rounded-lg bg-muted/30">
                      <Select
                        options={columns.map((c) => ({ value: c, label: c }))}
                        value={filter.column}
                        onChange={(e) => updateFilter(i, "column", e.target.value)}
                        className="flex-1"
                      />
                      <Select
                        options={[
                          { value: "equals", label: "=" },
                          { value: "not_equals", label: "≠" },
                          { value: "contains", label: "contains" },
                          { value: "gt", label: ">" },
                          { value: "lt", label: "<" },
                          { value: "gte", label: "≥" },
                          { value: "lte", label: "≤" },
                        ]}
                        value={filter.operator}
                        onChange={(e) => updateFilter(i, "operator", e.target.value)}
                        className="w-24"
                      />
                      <Input
                        placeholder="Value"
                        value={filter.value}
                        onChange={(e) => updateFilter(i, "value", e.target.value)}
                        className="flex-1"
                      />
                      <button
                        onClick={() => removeFilter(i)}
                        className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-muted transition-colors"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Chart Title */}
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <Input
                      placeholder="Chart title (optional)"
                      value={config.title}
                      onChange={(e) => updateConfig("title", e.target.value)}
                      className="flex-1"
                    />
                    <Button
                      size="lg"
                      onClick={handleGenerate}
                      disabled={!canGenerate || generating}
                      className="shadow-lg shadow-primary/20"
                    >
                      {generating ? (
                        <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating...</>
                      ) : (
                        <><Play className="mr-2 h-4 w-4" /> Generate Chart</>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Generation Preview Area */}
              <AnimatePresence>
                {generating && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                  >
                    <Card className="border-primary/20">
                      <CardContent className="p-10 text-center">
                        <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto mb-4" />
                        <p className="font-medium">Generating your chart...</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Building {config.chartType} chart with {config.xAxis} vs {config.yAxis}
                          {config.aggregation !== "none" && ` (${config.aggregation})`}
                        </p>
                        <div className="flex items-center justify-center gap-2 mt-4">
                          <Badge variant="secondary">{config.chartType}</Badge>
                          <Badge variant="secondary">{config.colorScheme}</Badge>
                          {config.filters.length > 0 && (
                            <Badge variant="secondary">{config.filters.length} filter{config.filters.length > 1 ? "s" : ""}</Badge>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* ── Preview / Summary Panel ── */}
            <div className="space-y-4">
              <Card className="lg:sticky lg:top-24">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Configuration Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Chart Type</span>
                      <span className="font-medium capitalize">{config.chartType}</span>
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">X Axis</span>
                      <span className="font-medium">{config.xAxis || "—"}</span>
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Y Axis</span>
                      <span className="font-medium">{config.yAxis || "—"}</span>
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Aggregation</span>
                      <span className="font-medium capitalize">{config.aggregation}</span>
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Color Scheme</span>
                      <span className="font-medium capitalize">{config.colorScheme}</span>
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Filters</span>
                      <span className="font-medium">{config.filters.length} active</span>
                    </div>
                  </div>

                  <Button
                    className="w-full"
                    onClick={handleGenerate}
                    disabled={!canGenerate || generating}
                  >
                    {generating ? (
                      <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating...</>
                    ) : (
                      <><Play className="mr-2 h-4 w-4" /> Generate Chart</>
                    )}
                  </Button>

                  <p className="text-[10px] text-muted-foreground text-center">
                    {canGenerate
                      ? "Click to generate chart based on your configuration"
                      : "Select X and Y axes to enable generation"}
                  </p>
                </CardContent>
              </Card>

              {/* Tips */}
              <Card className="bg-muted/30">
                <CardContent className="p-4">
                  <p className="text-xs font-medium mb-2">Tip</p>
                  <p className="text-[10px] text-muted-foreground leading-relaxed">
                    Bar charts work well for comparing categories.
                    Line charts are ideal for trends over time.
                    Scatter plots reveal relationships between variables.
                    Use filters to focus on specific data segments.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}

export default function VisualizationsPage() {
  return (
    <Suspense fallback={
      <AppShell>
        <div className="max-w-5xl mx-auto px-6 py-10">
          <LoadingScreen message="Loading visualization studio..." />
        </div>
      </AppShell>
    }>
      <VisualizationContent />
    </Suspense>
  );
}
