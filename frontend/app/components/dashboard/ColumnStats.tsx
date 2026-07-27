"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { ColumnInfo } from "@/types";

interface ColumnStatsProps {
  columns: ColumnInfo[];
}

export function ColumnStats({ columns }: ColumnStatsProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Column Details</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-3 py-2 text-left font-medium text-muted-foreground">Column</th>
                <th className="px-3 py-2 text-left font-medium text-muted-foreground">Type</th>
                <th className="px-3 py-2 text-right font-medium text-muted-foreground">Non-Null</th>
                <th className="px-3 py-2 text-right font-medium text-muted-foreground">Null</th>
                <th className="px-3 py-2 text-right font-medium text-muted-foreground">Null %</th>
              </tr>
            </thead>
            <tbody>
              {columns.map((col) => (
                <tr key={col.name} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="px-3 py-2 font-medium">{col.name}</td>
                  <td className="px-3 py-2">
                    <Badge variant="secondary">{col.dtype}</Badge>
                  </td>
                  <td className="px-3 py-2 text-right">{col.non_null_count.toLocaleString()}</td>
                  <td className="px-3 py-2 text-right">{col.null_count.toLocaleString()}</td>
                  <td className="px-3 py-2 text-right">
                    <span className={col.null_percentage > 10 ? "text-amber-500" : "text-muted-foreground"}>
                      {col.null_percentage.toFixed(1)}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
