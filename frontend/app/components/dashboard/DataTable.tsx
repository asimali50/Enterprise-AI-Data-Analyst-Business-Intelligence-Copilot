"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { DatasetPreview } from "@/types";

interface DataTableProps {
  preview: DatasetPreview;
}

export function DataTable({ preview }: DataTableProps) {
  const [search, setSearch] = useState("");

  const filtered = preview.preview_data.filter((row) => {
    if (!search) return true;
    return Object.values(row).some((v) =>
      String(v).toLowerCase().includes(search.toLowerCase()),
    );
  });

  const columns = preview.columns.map((c) => c.name);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium">Data Preview</CardTitle>
        <Input
          placeholder="Search..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs h-8 text-xs"
        />
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                {columns.map((col) => (
                  <th key={col} className="px-3 py-2 text-left font-medium text-muted-foreground whitespace-nowrap">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((row, i) => (
                <tr key={i} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                  {columns.map((col) => (
                    <td key={col} className="px-3 py-2 whitespace-nowrap max-w-[200px] truncate">
                      {row[col] !== null && row[col] !== undefined ? String(row[col]) : (
                        <span className="text-muted-foreground italic">null</span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Showing {filtered.length} of {preview.preview_data.length} rows (first 5)
        </p>
      </CardContent>
    </Card>
  );
}
