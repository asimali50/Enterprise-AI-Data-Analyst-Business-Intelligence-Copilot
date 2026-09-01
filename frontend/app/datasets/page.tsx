"use client";

import { useState } from "react";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { useDatasets, useDeleteDataset } from "@/hooks/useAnalysis";
import {
  Database,
  Search,
  Plus,
  Trash2,
  BarChart3,
  FileText,
  MoreHorizontal,
  Calendar,
  HardDrive,
  Table,
  Activity,
} from "lucide-react";
import { formatDate } from "@/utils/cn";
import { DropdownMenu } from "@/components/ui/dropdown-menu";
import { Dialog } from "@/components/ui/dialog";

const statusVariant = (status: string): "success" | "warning" | "destructive" | "secondary" => {
  const map: Record<string, "success" | "warning" | "destructive" | "secondary"> = {
    completed: "success",
    processing: "warning",
    pending: "secondary",
    failed: "destructive",
  };
  return map[status] || "secondary";
};

export default function DatasetsPage() {
  const router = useRouter();
  usePageTitle("Datasets");
  const [search, setSearch] = useState("");
  const [deleteDialog, setDeleteDialog] = useState<string | null>(null);
  const { data: datasetsData, isLoading: loading } = useDatasets();
  const deleteMutation = useDeleteDataset();
  const datasets = datasetsData?.datasets || [];

  const filtered = datasets.filter((ds) =>
    ds.filename.toLowerCase().includes(search.toLowerCase()),
  );

  const handleDelete = (id: string) => {
    deleteMutation.mutate(id, {
      onSuccess: () => setDeleteDialog(null),
      onSettled: () => setDeleteDialog(null),
    });
  };

  return (
    <AppShell>
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* ── Header ── */}
        <PageHeader
          title="Datasets"
          subtitle={`Manage your uploaded datasets — ${datasets.length} total`}
          actions={
            <Button onClick={() => router.push("/datasets/upload")}>
              <Plus className="mr-1.5 h-4 w-4" />
              Upload Dataset
            </Button>
          }
        />

        {/* ── Loading skeleton ── */}
        {loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-xl border border-border bg-card p-6 space-y-4">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10 rounded-xl" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                </div>
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-2/3" />
              </div>
            ))}
          </div>
        )}

        {/* ── Search ── */}
        <div className="relative max-w-md mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search datasets..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* ── Empty State ── */}
        {!loading && filtered.length === 0 && !search && (
          <EmptyState
            icon={Database}
            title="No datasets yet"
            description="Upload your first dataset to start analyzing your data with AI-powered insights."
            action={{ label: "Upload Dataset", onClick: () => router.push("/datasets/upload") }}
          />
        )}

        {!loading && filtered.length === 0 && search && (
          <EmptyState
            icon={Search}
            title="No datasets found"
            description={`No datasets match "${search}". Try a different search term.`}
          />
        )}

        {/* ── Dataset Grid ── */}
        {!loading && filtered.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((ds) => (
              <Card
                key={ds.id}
                className="group cursor-pointer transition-all hover:shadow-md hover:border-primary/20"
                onClick={() => router.push(`/datasets/${ds.id}`)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                        <Database className="h-5 w-5 text-primary" strokeWidth={1.5} />
                      </div>
                      <div className="min-w-0">
                        <CardTitle className="text-sm font-semibold truncate max-w-[180px]">
                          {ds.filename}
                        </CardTitle>
                        <Badge variant={statusVariant(ds.analysis_status)} className="mt-1">
                          {ds.analysis_status}
                        </Badge>
                      </div>
                    </div>
                    <DropdownMenu
                      trigger={
                        <button
                          type="button"
                          onClick={(e) => e.stopPropagation()}
                          aria-label={`Actions for ${ds.filename}`}
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </button>
                      }
                      items={[
                        {
                          label: "View Details",
                          icon: <BarChart3 className="h-4 w-4" />,
                          onClick: () => router.push(`/datasets/${ds.id}`),
                        },
                        {
                          label: "View Reports",
                          icon: <FileText className="h-4 w-4" />,
                          onClick: () => router.push(`/reports?dataset=${ds.id}`),
                        },
                        { label: "", onClick: () => {}, separator: true },
                        {
                          label: "Delete Dataset",
                          icon: <Trash2 className="h-4 w-4" />,
                          onClick: () => setDeleteDialog(ds.id),
                          variant: "destructive",
                        },
                      ]}
                    />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <p className="text-lg font-semibold">{ds.num_rows.toLocaleString()}</p>
                      <p className="text-[10px] text-muted-foreground flex items-center justify-center gap-1">
                        <Table className="h-3 w-3" /> Rows
                      </p>
                    </div>
                    <div>
                      <p className="text-lg font-semibold">{ds.num_columns}</p>
                      <p className="text-[10px] text-muted-foreground flex items-center justify-center gap-1">
                        <BarChart3 className="h-3 w-3" /> Columns
                      </p>
                    </div>
                    <div>
                      <p className="text-lg font-semibold">{ds.health_score}</p>
                      <p className="text-[10px] text-muted-foreground flex items-center justify-center gap-1">
                        <Activity className="h-3 w-3" /> Health
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-4 pt-3 border-t border-border text-[10px] text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <HardDrive className="h-3 w-3" /> {ds.file_size_mb.toFixed(1)} MB
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" /> {formatDate(ds.upload_date)}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* ── Delete Confirmation ── */}
        <Dialog
          open={!!deleteDialog}
          onClose={() => setDeleteDialog(null)}
          title="Delete Dataset"
          description="Are you sure you want to delete this dataset? This action cannot be undone and all associated analysis results will be lost."
          size="sm"
        >
          <div className="flex justify-end gap-3 mt-2">
            <Button variant="outline" onClick={() => setDeleteDialog(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={deleteMutation.isPending}
              onClick={() => deleteDialog && handleDelete(deleteDialog)}
            >
              <Trash2 className="mr-1.5 h-4 w-4" />
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </Button>
          </div>
        </Dialog>
      </div>
    </AppShell>
  );
}

