"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Navigation } from "@/components/Navigation";
import { FileUpload } from "@/components/dashboard/FileUpload";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

const FEATURES = [
  {
    icon: "🔍",
    title: "Data Profiling",
    desc: "Automatic schema detection, quality scoring, and outlier identification",
  },
  {
    icon: "📈",
    title: "Statistical Analytics",
    desc: "KPIs, correlations, trends, and anomaly detection across all columns",
  },
  {
    icon: "📊",
    title: "Auto Visualizations",
    desc: "10+ chart types generated automatically — bar, scatter, heatmap, and more",
  },
  {
    icon: "💡",
    title: "Business Insights",
    desc: "Executive summaries, opportunities, risks, and actionable recommendations",
  },
  {
    icon: "💬",
    title: "Natural Language Chat",
    desc: "Ask questions about your data in plain English and get instant answers",
  },
  {
    icon: "📄",
    title: "Report Generation",
    desc: "Professional Markdown reports combining all analysis results",
  },
];

export default function HomePage() {
  const router = useRouter();
  const [datasetId, setDatasetId] = useState<string | null>(null);

  const handleUploaded = (id: string) => {
    setDatasetId(id);
    router.push(`/dashboard?dataset=${id}`);
  };

  return (
    <div className="min-h-screen">
      <Navigation />

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/5" />
        <div className="relative max-w-5xl mx-auto px-6 pt-20 pb-16 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
              Enterprise AI Data Analyst
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
              Transform raw data into actionable business intelligence with multi-agent AI orchestration,
              interactive visualizations, and natural language insights.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="max-w-xl mx-auto mb-16"
          >
            <FileUpload onUploaded={handleUploaded} />
          </motion.div>

          {/* Feature Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-8">
            {FEATURES.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.3 + i * 0.08 }}
              >
                <Card className="h-full text-left hover:shadow-md transition-shadow">
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{f.icon}</span>
                      <CardTitle className="text-base">{f.title}</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">{f.desc}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          {/* Architecture Preview */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.8 }}
            className="mt-16"
          >
            <Card className="max-w-3xl mx-auto">
              <CardHeader>
                <CardTitle className="text-sm font-medium text-muted-foreground">How It Works</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between gap-2 text-sm">
                  {["Upload Data", "AI Agents Analyze", "Visualizations", "Insights & Reports"].map((step, i) => (
                    <div key={step} className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-xs">
                        {i + 1}
                      </div>
                      <span className="font-medium hidden sm:inline">{step}</span>
                      {i < 3 && <span className="text-muted-foreground hidden lg:inline">→</span>}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
