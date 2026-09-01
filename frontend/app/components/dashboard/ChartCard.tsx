"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import dynamic from "next/dynamic";
import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Maximize2, Minimize2, Download, Loader2 } from "lucide-react";
import type { ChartSpec } from "@/types";
import { getChartTheme } from "@/utils/chartTheme";
import toast from "react-hot-toast";

const Plot = dynamic(() => import("react-plotly.js"), { ssr: false });

interface ChartCardProps {
  chart: ChartSpec;
  /** Show export + fullscreen chrome (true for the visualization gallery) */
  interactive?: boolean;
}

function slugifyTitle(title: string): string {
  return (
    title
      .replace(/[^a-z0-9-_ ]/gi, "")
      .trim()
      .replace(/\s+/g, "-")
      .toLowerCase() || "chart"
  );
}

/**
 * Enterprise chart card — theme-aware plotly colors, fullscreen mode and
 * PNG export. Series colors use the validated dataviz categorical palette.
 */
export function ChartCard({ chart, interactive = true }: ChartCardProps) {
  const [fullscreen, setFullscreen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [graphDiv, setGraphDiv] = useState<HTMLElement | null>(null);

  const theme = getChartTheme();
  const layout = chart.layout || {};
  const xaxis = (layout.xaxis as Record<string, unknown>) || {};
  const yaxis = (layout.yaxis as Record<string, unknown>) || {};
  const legend = (layout.legend as Record<string, unknown>) || {};

  const baseLayout = {
    ...layout,
    autosize: true,
    margin: { l: 50, r: 24, t: 12, b: 50 },
    paper_bgcolor: theme.paperColor,
    plot_bgcolor: theme.plotColor,
    font: { color: theme.fontColor, size: 12, family: "Inter, system-ui, sans-serif" },
    xaxis: { ...xaxis, gridcolor: theme.gridColor, zerolinecolor: theme.axisColor },
    yaxis: { ...yaxis, gridcolor: theme.gridColor, zerolinecolor: theme.axisColor },
    colorway: theme.colorway,
    legend: { ...legend, font: { color: theme.fontColor, size: 12 } },
  };

  const exportPng = useCallback(async () => {
    if (!graphDiv) return;
    try {
      setExporting(true);
      const plotly = (await import("plotly.js-dist-min")).default;
      await plotly.downloadImage(graphDiv, {
        format: "png",
        filename: slugifyTitle(chart.title),
        width: 1600,
        height: 1000,
      });
      toast.success("Chart exported as PNG");
    } catch {
      toast.error("Failed to export chart");
    } finally {
      setExporting(false);
    }
  }, [graphDiv, chart.title]);

  const renderPlot = ({ height, fill }: { height?: number; fill?: boolean }) => (
    <Plot
      data={chart.data}
      layout={baseLayout}
      config={{ responsive: true, displayModeBar: false }}
      useResizeHandler
      onInitialized={(_, div) => setGraphDiv(div)}
      onUpdate={(_, div) => setGraphDiv(div)}
      style={{
        width: "100%",
        height: fill ? "100%" : height ?? 300,
      }}
    />
  );

  return (
    <>
      <Card className="group transition-all hover:shadow-cardHover">
        <CardHeader className="pb-1">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-sm font-medium truncate">{chart.title}</CardTitle>
            {interactive && (
              <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  aria-label="Export as PNG"
                  onClick={exportPng}
                  disabled={exporting}
                >
                  {exporting ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Download className="h-3.5 w-3.5" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  aria-label="Open fullscreen"
                  onClick={() => setFullscreen(true)}
                >
                  <Maximize2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="pt-2">
          <div className="w-full" style={{ minHeight: 300 }}>
            {renderPlot({ height: 300 })}
          </div>
        </CardContent>
      </Card>

      {/* Fullscreen overlay */}
      <AnimatePresence>
        {fullscreen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-50 flex flex-col bg-background"
            role="dialog"
            aria-modal="true"
            aria-label={`${chart.title} — fullscreen`}
          >
            <div className="flex items-center justify-between px-6 h-14 border-b border-border shrink-0">
              <h3 className="text-sm font-semibold truncate">{chart.title}</h3>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="sm" onClick={exportPng} disabled={exporting}>
                  {exporting ? (
                    <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Exporting...</>
                  ) : (
                    <><Download className="mr-1.5 h-3.5 w-3.5" /> PNG</>
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Exit fullscreen"
                  onClick={() => setFullscreen(false)}
                >
                  <Minimize2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="flex-1 p-6 min-h-0">
              {renderPlot({ fill: true })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
