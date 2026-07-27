"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { BusinessInsight, ActionItem } from "@/types";

interface InsightsPanelProps {
  executive_summary?: string;
  key_findings?: BusinessInsight[];
  opportunities?: string[];
  risks?: string[];
  action_items?: ActionItem[];
}

export function InsightsPanel({
  executive_summary,
  key_findings = [],
  opportunities = [],
  risks = [],
  action_items = [],
}: InsightsPanelProps) {
  return (
    <div className="space-y-4">
      {/* Executive Summary */}
      {executive_summary && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Executive Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-wrap">
              {executive_summary}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Key Findings */}
      {key_findings.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Key Findings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {key_findings.map((finding, i) => (
              <div key={i} className="flex gap-3">
                <Badge
                  variant={
                    finding.impact === "high"
                      ? "destructive"
                      : finding.impact === "medium"
                      ? "warning"
                      : "success"
                  }
                  className="mt-0.5 shrink-0"
                >
                  {finding.impact}
                </Badge>
                <div>
                  <p className="text-sm font-medium">{finding.title}</p>
                  <p className="text-xs text-muted-foreground">{finding.description}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Opportunities & Risks */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {opportunities.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-emerald-500">💡 Opportunities</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {opportunities.map((opp, i) => (
                  <li key={i} className="text-sm text-muted-foreground pl-4 relative before:content-['•'] before:absolute before:left-0 before:text-emerald-500">
                    {opp}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {risks.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-amber-500">⚠️ Risks</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {risks.map((risk, i) => (
                  <li key={i} className="text-sm text-muted-foreground pl-4 relative before:content-['•'] before:absolute before:left-0 before:text-amber-500">
                    {risk}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Action Items */}
      {action_items.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Action Items</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {action_items.map((item, i) => (
                <div key={i} className="flex gap-3 items-start p-3 rounded-lg bg-muted/30">
                  <Badge
                    variant={
                      item.priority === "high"
                        ? "destructive"
                        : item.priority === "medium"
                        ? "warning"
                        : "success"
                    }
                    className="shrink-0"
                  >
                    {item.priority}
                  </Badge>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{item.action}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{item.expected_outcome}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Timeline: {item.timeline}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
