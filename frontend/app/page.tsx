"use client";

import { useState } from "react";
import { usePageTitle } from "@/hooks/usePageTitle";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { motion } from "framer-motion";
import {
  Bot,
  ArrowRight,
  BarChart3,
  FileSearch,
  Sparkles,
  Lightbulb,
  MessageSquareText,
  FileText,
  Database,
  Layers,
  Shield,
  Zap,
  TrendingUp,
  CheckCircle2,
  ChevronRight,
  Star,
  Menu,
  X,
} from "lucide-react";

const FEATURES = [
  {
    icon: FileSearch,
    title: "Data Profiling",
    desc: "Automatic schema detection, quality scoring, and anomaly identification across all your datasets.",
    color: "from-primary/20 to-primary/5",
    accent: "text-primary",
  },
  {
    icon: BarChart3,
    title: "Statistical Analytics",
    desc: "Descriptive stats, correlations, regression, clustering, forecasting — run what you need, when you need.",
    color: "from-brand-teal/20 to-brand-teal/5",
    accent: "text-brand-teal",
  },
  {
    icon: Sparkles,
    title: "Interactive Cleaning",
    desc: "AI recommends data cleaning actions. You review and decide what to apply — full manual control.",
    color: "from-brand-violet/20 to-brand-violet/5",
    accent: "text-brand-violet",
  },
  {
    icon: Lightbulb,
    title: "AI Business Insights",
    desc: "Executive summaries, opportunities, risks, and actionable recommendations powered by multi-agent AI.",
    color: "from-brand-violet/20 to-brand-violet/5",
    accent: "text-brand-violet",
  },
  {
    icon: MessageSquareText,
    title: "Chat with Data",
    desc: "Ask questions in plain English. Get instant answers, context-aware analysis, and visual responses.",
    color: "from-primary/20 to-primary/5",
    accent: "text-primary",
  },
  {
    icon: FileText,
    title: "Report Generation",
    desc: "Professional Markdown reports combining all analysis results. Export to PDF, HTML, or share directly.",
    color: "from-brand-teal/20 to-brand-teal/5",
    accent: "text-brand-teal",
  },
];

const WORKFLOW_STEPS = [
  { step: "01", title: "Upload Data", desc: "Drag & drop CSV, XLSX, or XLS files up to 100MB", icon: Database },
  { step: "02", title: "Explore & Profile", desc: "Auto-detect schema, data types, and quality scores", icon: FileSearch },
  { step: "03", title: "Clean & Prepare", desc: "AI recommends — you choose which cleaning actions to apply", icon: Sparkles },
  { step: "04", title: "Analyze & Visualize", desc: "Select analyses and build charts your way", icon: BarChart3 },
  { step: "05", title: "Get Insights", desc: "AI-generated business intelligence and recommendations", icon: Lightbulb },
  { step: "06", title: "Report & Export", desc: "Generate reports and export results in multiple formats", icon: FileText },
];

const STATS = [
  { label: "Datasets Analyzed", value: "10K+", icon: Database },
  { label: "AI Insights Generated", value: "50K+", icon: Lightbulb },
  { label: "Enterprise Users", value: "1K+", icon: Shield },
  { label: "Data Points Processed", value: "100M+", icon: TrendingUp },
];

const ENTERPRISE_FEATURES = [
  { icon: Shield, title: "SOC 2 Compliant", desc: "Enterprise-grade security with encrypted data processing" },
  { icon: Layers, title: "Multi-Dataset", desc: "Work across multiple datasets with cross-referencing" },
  { icon: Zap, title: "Real-time Processing", desc: "Instant analysis with streaming AI responses" },
  { icon: CheckCircle2, title: "Full Control", desc: "You decide every step — never fully automatic" },
];

export default function HomePage() {
  const router = useRouter();
  const [mobileMenu, setMobileMenu] = useState(false);
  usePageTitle("Enterprise AI Data Analyst");

  return (
    <div className="min-h-screen bg-background">
      {/* ─── Navigation ─── */}
      <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-6 h-16">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/70 shadow-sm">
              <Bot className="h-5 w-5 text-primary-foreground" strokeWidth={2} />
            </div>
            <span className="text-base font-semibold">Data Analyst</span>
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Enterprise</Badge>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1">
            <Link href="/auth/login">
              <Button variant="ghost" size="sm">Sign In</Button>
            </Link>
            <Link href="/auth/register">
              <Button size="sm" className="ml-2">
                Get Started <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
              </Button>
            </Link>
          </nav>

          {/* Mobile hamburger */}
          <button onClick={() => setMobileMenu(!mobileMenu)} className="md:hidden p-2">
            {mobileMenu ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
        {/* Mobile menu */}
        {mobileMenu && (
          <div className="md:hidden border-t border-border/50 px-6 py-4 space-y-2 bg-background">
            <Link href="/auth/login" className="block"><Button variant="ghost" className="w-full justify-start">Sign In</Button></Link>
            <Link href="/auth/register" className="block"><Button className="w-full">Get Started <ArrowRight className="ml-1.5 h-3.5 w-3.5" /></Button></Link>
          </div>
        )}
      </header>

      {/* ─── Hero ─── */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent pointer-events-none" />
        <div className="absolute top-0 right-0 w-1/2 h-1/2 bg-gradient-to-bl from-primary/10 via-transparent to-transparent blur-3xl pointer-events-none" />

        <div className="max-w-6xl mx-auto px-6 pt-20 pb-24 md:pt-28 md:pb-32 text-center relative">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <Badge variant="secondary" className="mb-6 px-3 py-1 text-xs">
              <Star className="h-3 w-3 mr-1 text-amber-500" />
              Enterprise AI Data Analytics Platform
            </Badge>
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-semibold tracking-tight mb-6 leading-[1.05]">
              Transform Data into{" "}
              <span className="bg-gradient-to-r from-primary via-brand-violet to-brand-teal bg-clip-text text-transparent">
                Business Intelligence
              </span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto mb-10 leading-relaxed">
              A comprehensive enterprise analytics suite with AI-powered insights,
              interactive visualizations, and full user control over every analysis step.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/auth/register">
                <Button size="lg" className="h-13 px-8 text-base shadow-lg shadow-primary/25">
                  Start Free Trial <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link href="#features">
                <Button variant="outline" size="lg" className="h-13 px-8 text-base">
                  Explore Features
                </Button>
              </Link>
            </div>
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-20"
          >
            {STATS.map((stat) => (
              <div key={stat.label} className="flex flex-col items-center gap-2 p-4">
                <stat.icon className="h-5 w-5 text-primary/60" strokeWidth={1.5} />
                <span className="text-3xl font-bold">{stat.value}</span>
                <span className="text-xs text-muted-foreground">{stat.label}</span>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ─── Features Grid ─── */}
      <section id="features" className="py-20 md:py-28">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true, margin: "-100px" }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-semibold tracking-tight mb-4">Everything you need to analyze data</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              A complete workflow from data upload to business intelligence — with you in control at every step.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.4, delay: i * 0.05 }}
              >
                <Card className="group h-full hover:shadow-lg hover:border-primary/20 transition-all duration-300">
                  <CardHeader>
                    <div className={`flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${f.color} mb-2`}>
                      <f.icon className={`h-6 w-6 ${f.accent}`} strokeWidth={1.5} />
                    </div>
                    <CardTitle className="text-base">{f.title}</CardTitle>
                    <CardDescription className="text-sm leading-relaxed">{f.desc}</CardDescription>
                  </CardHeader>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Workflow ─── */}
      <section className="py-20 md:py-28 bg-muted/30 border-y border-border/50">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true, margin: "-100px" }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-semibold tracking-tight mb-4">Controlled workflow, every step</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Unlike fully automatic tools, you decide what happens at each stage.
              AI assists — you approve.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {WORKFLOW_STEPS.map((step, i) => (
              <motion.div
                key={step.step}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.4, delay: i * 0.08 }}
              >
                <Card className="h-full hover:shadow-md transition-all duration-300">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary font-bold text-sm">
                        {step.step}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <step.icon className="h-4 w-4 text-primary/60" strokeWidth={1.5} />
                          <h3 className="font-semibold text-sm">{step.title}</h3>
                        </div>
                        <p className="text-xs text-muted-foreground">{step.desc}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Enterprise Features ─── */}
      <section className="py-20 md:py-28">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <Badge variant="secondary" className="mb-4">Enterprise Ready</Badge>
              <h2 className="text-3xl md:text-4xl font-semibold tracking-tight mb-6">
                Built for teams that need <span className="text-primary">control</span>
              </h2>
              <p className="text-muted-foreground mb-8 leading-relaxed">
                Not another black-box AI tool. Every analysis, visualization, and insight is
                generated at your request — not automatically. Review, modify, and approve
                before anything changes.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {ENTERPRISE_FEATURES.map((ef) => (
                  <div key={ef.title} className="flex gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                      <ef.icon className="h-4 w-4 text-primary" strokeWidth={1.5} />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{ef.title}</p>
                      <p className="text-xs text-muted-foreground">{ef.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="relative"
            >
              <Card className="shadow-xl border-primary/20">
                <CardContent className="p-8">
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 pb-4 border-b border-border">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                        <Bot className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">Try it free</p>
                        <p className="text-xs text-muted-foreground">No credit card required</p>
                      </div>
                    </div>
                    {[
                      "Full access to all analysis modules",
                      "AI-powered insights & chat",
                      "Export reports & visualizations",
                      "14-day free trial",
                    ].map((item) => (
                      <div key={item} className="flex items-center gap-3 text-sm">
                        <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                        <span>{item}</span>
                      </div>
                    ))}
                    <Link href="/auth/register" className="block mt-6">
                      <Button className="w-full h-12 text-base">
                        Start Free Trial <ChevronRight className="ml-1 h-4 w-4" />
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ─── CTA ─── */}
      <section className="py-20 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent pointer-events-none" />
        <div className="max-w-4xl mx-auto px-6 text-center relative">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl md:text-4xl font-semibold tracking-tight mb-4">Ready to analyze your data?</h2>
            <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
              Start with your first dataset analysis in minutes. Full control, AI-powered insights,
              enterprise-grade security.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/auth/register">
                <Button size="lg" className="h-13 px-8 text-base shadow-lg shadow-primary/25">
                  Get Started Free <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link href="/auth/login">
                <Button variant="outline" size="lg" className="h-13 px-8 text-base">
                  Sign In
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer className="border-t border-border/50 py-12">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                <Bot className="h-4 w-4 text-primary" strokeWidth={2} />
              </div>
              <span className="text-sm font-medium">Enterprise AI Data Analyst</span>
            </div>
            <p className="text-xs text-muted-foreground">
              &copy; 2026 Enterprise AI Data Analyst. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
