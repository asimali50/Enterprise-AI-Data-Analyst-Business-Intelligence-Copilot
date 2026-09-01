"use client";

import { Suspense, useState } from "react";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useSearchParams, useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs } from "@/components/ui/tabs";
import { LoadingScreen } from "@/components/ui/loading-screen";
import { ErrorState } from "@/components/ui/error-state";
import { EmptyState } from "@/components/ui/empty-state";
import { useReportList, useGenerateReport, useReport } from "@/hooks/useReports";
import { useDatasetPreview } from "@/hooks/useAnalysis";
import { formatDate } from "@/utils/cn";
import ReactMarkdown from "react-markdown";
import { FileText, Plus, Loader2, Clock } from "lucide-react";

function ReportsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const datasetId = searchParams.get("dataset");
  const { data: preview } = useDatasetPreview(datasetId);
  const { data: reportsData, isLoading, error, refetch } = useReportList(datasetId);
  const generateReport = useGenerateReport(datasetId);
  const [selectedReport, setSelectedReport] = useState<string | null>(null);
  usePageTitle("Reports");
  const [activeTab, setActiveTab] = useState("all");

  // ── No Dataset ──
  if (!datasetId) {
    return (
      <AppShell>
        <div className="max-w-5xl mx-auto px-6 py-10">
          <EmptyState
            icon={FileText}
            title="Select a dataset"
            description="Choose a dataset to generate and view professional analysis reports."
            action={{ label: "Go to Datasets", onClick: () => router.push("/datasets") }}
          />
        </div>
      </AppShell>
    );
  }

  const allReports = reportsData?.reports || [];

  const tabs = [
    { id: "all", label: "All Reports", badge: allReports.length.toString() },
    { id: "summary", label: "Summaries" },
    { id: "detailed", label: "Detailed" },
  ];

  const reports = activeTab === "all"
    ? allReports
    : allReports.filter((r) => r.report_type?.toLowerCase() === activeTab);

  return (
    <AppShell>
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Reports</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {preview?.filename || "Dataset"} &middot; {reports.length} report{reports.length !== 1 ? "s" : ""}
            </p>
          </div>
          <Button onClick={() => generateReport.mutate()} disabled={generateReport.isPending} size="sm">
            {generateReport.isPending ? (
              <><Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> Generating...</>
            ) : (
              <><Plus className="mr-1.5 h-4 w-4" /> Generate Report</>
            )}
          </Button>
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="py-16">
            <LoadingScreen message="Loading reports..." />
          </div>
        )}

        {/* Error */}
        {error && (
          <ErrorState
            title="Failed to load reports"
            message="There was an error loading your reports."
            onRetry={() => refetch()}
            onBack={() => router.push("/datasets")}
          />
        )}

        {/* Empty */}
        {!isLoading && !error && reports.length === 0 && (
          <Card className="text-center py-16">
            <CardContent>
              <div className="flex flex-col items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
                  <FileText className="h-8 w-8 text-primary" strokeWidth={1.5} />
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-1">No reports yet</h3>
                  <p className="text-sm text-muted-foreground max-w-md">
                    Generate your first report to get a professional summary of your analysis results.
                  </p>
                </div>
                <Button onClick={() => generateReport.mutate()} disabled={generateReport.isPending} size="lg">
                  {generateReport.isPending ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating...</>
                  ) : (
                    <><Plus className="mr-2 h-4 w-4" /> Generate Report</>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Reports */}
        {!isLoading && !error && reports.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Sidebar */}
            <div className="lg:col-span-1 space-y-2">
              <Tabs tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} variant="pills" size="sm" className="mb-3" />
              {reports.map((report) => (
                <Card
                  key={report.id}
                  className={`cursor-pointer transition-all hover:shadow-md ${
                    selectedReport === report.id ? "border-primary shadow-sm" : ""
                  }`}
                  onClick={() => setSelectedReport(report.id)}
                >
                  <CardContent className="p-3">
                    <div className="flex items-start justify-between">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{report.title}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="secondary" className="text-[10px]">{report.report_type}</Badge>
                          <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" /> {formatDate(report.created_at)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Content */}
            <div className="lg:col-span-2">
              {selectedReport ? (
                <ReportViewer key={selectedReport} reportId={selectedReport} />
              ) : (
                <Card className="h-full">
                  <CardContent className="flex items-center justify-center h-64">
                    <div className="text-center">
                      <FileText className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" strokeWidth={1.5} />
                      <p className="text-sm text-muted-foreground">Select a report to view its contents</p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}

function ReportViewer({ reportId }: { reportId: string }) {
  const { data: report, isLoading } = useReport(reportId);
  const content = report?.content || null;

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <LoadingScreen message="Loading report..." spinnerSize="sm" />
        </CardContent>
      </Card>
    );
  }

  if (!content) {
    return (
      <Card>
        <CardContent className="p-10 text-center">
          <p className="text-sm text-muted-foreground">Failed to load report content.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-8">
        <div className="prose dark:prose-invert max-w-none">
          <ReactMarkdown>{content}</ReactMarkdown>
        </div>
      </CardContent>
    </Card>
  );
}

export default function ReportsPage() {
  return (
    <Suspense fallback={
      <AppShell>
        <div className="max-w-5xl mx-auto px-6 py-10">
          <LoadingScreen message="Loading reports..." />
        </div>
      </AppShell>
    }>
      <ReportsContent />
    </Suspense>
  );
}
