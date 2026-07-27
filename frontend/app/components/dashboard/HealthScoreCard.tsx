"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getHealthColor, getHealthBg, formatNumber } from "@/utils/cn";

interface HealthScoreCardProps {
  score: number;
  completeness?: number;
  consistency?: number;
  validity?: number;
}

export function HealthScoreCard({ score, completeness, consistency, validity }: HealthScoreCardProps) {
  const color = getHealthColor(score);
  const bg = getHealthBg(score);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">Data Health Score</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4">
          <div className={`flex h-20 w-20 items-center justify-center rounded-full ${bg}`}>
            <span className={`text-2xl font-bold ${color}`}>{formatNumber(score)}</span>
          </div>
          <div className="flex-1 space-y-2">
            {completeness !== undefined && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Completeness</span>
                <span className="font-medium">{completeness}%</span>
              </div>
            )}
            {consistency !== undefined && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Consistency</span>
                <span className="font-medium">{consistency}%</span>
              </div>
            )}
            {validity !== undefined && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Validity</span>
                <span className="font-medium">{validity}%</span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
