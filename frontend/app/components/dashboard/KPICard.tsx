"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatNumber } from "@/utils/cn";
import type { KPI } from "@/types";

interface KPICardProps {
  kpi: KPI;
}

export function KPICard({ kpi }: KPICardProps) {
  const trendVariant = kpi.trend === "up" ? "success" : kpi.trend === "down" ? "destructive" : "secondary";
  const trendIcon = kpi.trend === "up" ? "↑" : kpi.trend === "down" ? "↓" : "→";

  return (
    <Card className="transition-all hover:shadow-md">
      <CardHeader className="pb-1">
        <CardTitle className="text-xs font-medium text-muted-foreground truncate">{kpi.name}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-end justify-between">
          <span className="text-2xl font-bold">{formatNumber(kpi.value)}</span>
          <Badge variant={trendVariant}>
            {trendIcon} {kpi.trend}
          </Badge>
        </div>
        {kpi.unit && (
          <p className="mt-1 text-xs text-muted-foreground">{kpi.unit}</p>
        )}
      </CardContent>
    </Card>
  );
}
