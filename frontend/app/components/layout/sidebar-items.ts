import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Database,
  Upload,
  FileSearch,
  Sparkles,
  BarChart3,
  Lightbulb,
  MessageSquareText,
  FileText,
  Download,
  Cpu,
  TrainFront,
  Settings,
} from "lucide-react";

export interface SidebarItem {
  label: string;
  href: string;
  icon: LucideIcon;
  badge?: string | number;
  section: string;
  /** Short description used in the command palette and breadcrumb titles */
  description?: string;
  keywords?: string[];
}

export const SIDEBAR_ITEMS: SidebarItem[] = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    section: "Workspace",
    description: "Dataset overview, health score, KPIs and quick charts",
    keywords: ["home", "overview", "kpi", "metrics"],
  },
  {
    label: "Datasets",
    href: "/datasets",
    icon: Database,
    section: "Workspace",
    description: "Browse and manage uploaded datasets",
    keywords: ["files", "list", "manage"],
  },
  {
    label: "Upload Dataset",
    href: "/datasets/upload",
    icon: Upload,
    section: "Workspace",
    description: "Upload a CSV or Excel file",
    keywords: ["csv", "import", "file", "new"],
  },
  {
    label: "Data Profiling",
    href: "/profiling",
    icon: FileSearch,
    section: "Analysis",
    description: "Schema, data types and quality scoring",
    keywords: ["quality", "schema", "health"],
  },
  {
    label: "Data Cleaning",
    href: "/cleaning",
    icon: Sparkles,
    section: "Analysis",
    description: "AI-recommended cleaning actions",
    keywords: ["clean", "outliers", "missing", "quality"],
  },
  {
    label: "Statistical Analysis",
    href: "/analysis",
    icon: BarChart3,
    section: "Analysis",
    description: "Descriptive stats, correlation, regression and more",
    keywords: ["statistics", "correlation", "regression", "cluster"],
  },
  {
    label: "Visualizations",
    href: "/visualizations",
    icon: BarChart3,
    section: "Analysis",
    description: "Build charts from your dataset",
    keywords: ["charts", "plots", "graph", "viz"],
  },
  {
    label: "AutoML Studio",
    href: "/automl",
    icon: Cpu,
    section: "Analysis",
    description: "Detect tasks and get model recommendations",
    keywords: ["ml", "machine learning", "model", "train", "automl"],
  },
  {
    label: "Model Training",
    href: "/training",
    icon: TrainFront,
    section: "Analysis",
    description: "Train multiple ML models and compare metrics",
    keywords: ["ml", "machine learning", "model", "train", "pipeline", "automl"],
  },
  {
    label: "AI Insights",
    href: "/insights",
    icon: Lightbulb,
    section: "Intelligence",
    description: "Executive summaries and recommendations",
    keywords: ["ai", "summary", "recommendations"],
  },
  {
    label: "Chat with Data",
    href: "/chat",
    icon: MessageSquareText,
    section: "Intelligence",
    description: "Ask questions about your data in plain English",
    keywords: ["ask", "natural language", "assistant"],
  },
  {
    label: "Reports",
    href: "/reports",
    icon: FileText,
    section: "Output",
    description: "Generated reports in markdown",
    keywords: ["markdown", "summary", "documents"],
  },
  {
    label: "Export Center",
    href: "/export",
    icon: Download,
    section: "Output",
    description: "Download data in CSV, JSON and Markdown",
    keywords: ["download", "csv", "json", "md"],
  },
  {
    label: "Settings",
    href: "/settings",
    icon: Settings,
    section: "System",
    description: "Workspace, AI providers and account settings",
    keywords: ["preferences", "config", "theme"],
  },
];

export const NAV_SECTIONS = SIDEBAR_ITEMS.reduce<{ section: string; items: SidebarItem[] }[]>(
  (acc, item) => {
    const existing = acc.find((s) => s.section === item.section);
    if (existing) {
      existing.items.push(item);
    } else {
      acc.push({ section: item.section, items: [item] });
    }
    return acc;
  },
  [],
);

/** Resolve the current item (and its parent section) from a pathname. */
export function getCurrentItem(pathname: string): SidebarItem | undefined {
  return SIDEBAR_ITEMS.find((item) => {
    if (item.href === "/") return pathname === "/";
    return pathname === item.href || pathname.startsWith(item.href + "/");
  });
}
