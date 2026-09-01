"use client";

import { cn } from "@/utils/cn";
import { motion } from "framer-motion";
import { useState } from "react";

interface Tab {
  id: string;
  label: string;
  icon?: React.ReactNode;
  badge?: string | number;
  disabled?: boolean;
}

interface TabsProps {
  tabs: Tab[];
  activeTab?: string;
  onTabChange: (tabId: string) => void;
  className?: string;
  variant?: "underline" | "pills" | "buttons";
  size?: "sm" | "md" | "lg";
}

export function Tabs({
  tabs,
  activeTab,
  onTabChange,
  className,
  variant = "underline",
  size = "sm",
}: TabsProps) {
  const [localActive, setLocalActive] = useState(tabs[0]?.id || "");
  const current = activeTab ?? localActive;

  const handleChange = (tabId: string) => {
    setLocalActive(tabId);
    onTabChange(tabId);
  };

  const sizeClasses = {
    sm: "text-xs px-3 py-1.5",
    md: "text-sm px-4 py-2",
    lg: "text-base px-5 py-2.5",
  };

  if (variant === "pills") {
    return (
      <div className={cn("flex flex-wrap gap-1", className)}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => !tab.disabled && handleChange(tab.id)}
            disabled={tab.disabled}
            className={cn(
              "inline-flex items-center gap-2 rounded-lg font-medium transition-all duration-200",
              sizeClasses[size],
              current === tab.id
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-muted",
              tab.disabled && "opacity-40 cursor-not-allowed",
            )}
          >
            {tab.icon}
            {tab.label}
            {tab.badge !== undefined && (
              <span className="inline-flex items-center justify-center rounded-full bg-muted-foreground/20 px-1.5 py-0.5 text-[10px] font-medium">
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>
    );
  }

  if (variant === "buttons") {
    return (
      <div className={cn("flex flex-wrap gap-2", className)}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => !tab.disabled && handleChange(tab.id)}
            disabled={tab.disabled}
            className={cn(
              "inline-flex items-center gap-2 rounded-lg font-medium transition-all duration-200 border",
              sizeClasses[size],
              current === tab.id
                ? "bg-primary text-primary-foreground border-primary"
                : "border-border text-muted-foreground hover:text-foreground hover:bg-muted",
              tab.disabled && "opacity-40 cursor-not-allowed",
            )}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>
    );
  }

  // Underline variant
  return (
    <div className={cn("border-b border-border", className)}>
      <div className="flex -mb-px">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => !tab.disabled && handleChange(tab.id)}
            disabled={tab.disabled}
            className={cn(
              "relative inline-flex items-center gap-2 border-b-2 font-medium transition-colors whitespace-nowrap",
              sizeClasses[size],
              current === tab.id
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground",
              tab.disabled && "opacity-40 cursor-not-allowed",
            )}
          >
            {tab.icon}
            {tab.label}
            {tab.badge !== undefined && (
              <span
                className={cn(
                  "inline-flex items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-medium",
                  current === tab.id
                    ? "bg-primary/10 text-primary"
                    : "bg-muted text-muted-foreground",
                )}
              >
                {tab.badge}
              </span>
            )}
            {current === tab.id && (
              <motion.div
                layoutId="tab-indicator"
                className="absolute -bottom-[1px] left-0 right-0 h-0.5 bg-primary"
                transition={{ type: "spring", bounce: 0.2, duration: 0.3 }}
              />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
