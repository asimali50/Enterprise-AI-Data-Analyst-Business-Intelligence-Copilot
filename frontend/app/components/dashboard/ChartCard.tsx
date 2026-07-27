"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import dynamic from "next/dynamic";
import type { ChartSpec } from "@/types";

const Plot = dynamic(() => import("react-plotly.js"), { ssr: false });

interface ChartCardProps {
  chart: ChartSpec;
}

export function ChartCard({ chart }: ChartCardProps) {
  return (
    <Card className="transition-all hover:shadow-md">
      <CardHeader className="pb-1">
        <CardTitle className="text-sm font-medium">{chart.title}</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="w-full" style={{ minHeight: 300 }}>
          <Plot
            data={chart.data}
            layout={{
              ...chart.layout,
              autosize: true,
              margin: { l: 50, r: 20, t: 10, b: 50 },
              paper_bgcolor: "transparent",
              plot_bgcolor: "transparent",
              font: { color: "#94a3b8", size: 12 },
            }}
            config={{ ...chart.config, responsive: true, displayModeBar: false }}
            useResizeHandler
            style={{ width: "100%", height: 300 }}
          />
        </div>
      </CardContent>
    </Card>
  );
}
