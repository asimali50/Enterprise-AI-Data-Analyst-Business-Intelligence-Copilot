"use client";

import { cn } from "@/utils/cn";

interface BadgeProps {
  variant?: "default" | "secondary" | "success" | "warning" | "destructive";
  children: React.ReactNode;
  className?: string;
}

export function Badge({ variant = "default", children, className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors",
        {
          "bg-primary/10 text-primary": variant === "default",
          "bg-secondary text-secondary-foreground": variant === "secondary",
          "bg-emerald-500/10 text-emerald-500": variant === "success",
          "bg-amber-500/10 text-amber-500": variant === "warning",
          "bg-destructive/10 text-destructive": variant === "destructive",
        },
        className,
      )}
    >
      {children}
    </span>
  );
}
