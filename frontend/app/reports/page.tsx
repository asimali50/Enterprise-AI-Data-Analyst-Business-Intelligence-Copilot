"use client";

import { Suspense, useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Navigation } from "@/components/Navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useReportList, useGenerateReport } from "@/hooks/useReports";
import { useDatasetPreview } from "@/hooks/useAnalysis";
import { formatDate } from "@/utils/cn";
import ReactMarkdown from "react-markdown";

function ReportsContent() {
  const searchParams = useSearchParams();
  const datasetId = searchParams.get("dataset");
  const { data: preview } = useDatasetPreview(datasetId);
  const { data: reportsData, isLoading } = useReportList(datasetId);
  const generateReport = useGenerateReport(datasetId);
  const [selectedReport, setSelectedReport] = useState<string | null>(null);

  if (!datasetId) {
    return (
      <div className="min-h-screen">
        <Navigation />
        <div className="max-w-3xl mx-auto px-6 py-16 text-center">
          <h1 className="text-2xl font-bold mb-4">Reports</h1>
          <p className="text-muted-foreground mb-6">
            Upload and analyze a dataset to generate professional reports.
          </p>
          <a href="/dashboard" className="text-primary hover:underline">
            Go to Dashboard →
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Navigation />
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold">Reports</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {preview?.filename || "Dataset"} • {reportsData?.count || 0} reports
            </p>
          </div>
          <Button onClick={() => generateReport.mutate()} disabled={generateReport.isPending}>
            {generateReport.isPending ? "Generating..." : "Generate Report"}
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Report List */}
          <div className="lg:col-span-1 space-y-3">
            <h2 className="text-sm font-medium text-muted-foreground mb-2">Saved Reports</h2>
            {isLoading && (
              <Card className="animate-pulse">
                <CardContent className="p-6 h-16" />
              </Card>
            )}
            {reportsData?.reports.length === 0 && (
              <Card>
                <CardContent className="p-6 text-center text-sm text-muted-foreground">
                  No reports yet. Click &quot;Generate Report&quot; to create one.
                </CardContent>
              </Card>
            )}
            {reportsData?.reports.map((report) => (
              <Card
                key={report.id}
                className={`cursor-pointer transition-all hover:shadow-md ${
                  selectedReport === report.id ? "border-primary" : ""
                }`}
                onClick={() => setSelectedReport(report.id)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium text-sm">{report.title}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDate(report.created_at)}
                      </p>
                    </div>
                    <Badge variant="secondary">{report.report_type}</Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Report Content */}
          <div className="lg:col-span-2">
            {selectedReport ? (
              <ReportViewer reportId={selectedReport} />
            ) : (
              <Card className="h-full">
                <CardContent className="flex items-center justify-center h-64 text-muted-foreground text-sm">
                  Select a report to view its contents
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ReportViewer({ reportId }: { reportId: string }) {
  const [content, setContent] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    fetch(`/api/v1/reports/${reportId}`)
      .then((r) => r.json())
      .then((data) => setContent(data.content))
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, [reportId]);

  if (isLoading || !content) {
    return (
      <Card className="animate-pulse">
        <CardContent className="p-6 h-64" />
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
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <ReportsContent />
    </Suspense>
  );
}
