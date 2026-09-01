"use client";

import { cn } from "@/utils/cn";

interface SeparatorProps {
  className?: string;
  orientation?: "horizontal" | "vertical";
  label?: string;
}

export function Separator({
  className,
  orientation = "horizontal",
  label,
}: SeparatorProps) {
  if (orientation === "vertical") {
    return (
      <div
        className={cn(
          "mx-2 h-full w-px bg-border",
          className,
        )}
      />
    );
  }

  if (label) {
    return (
      <div className={cn("flex items-center gap-3", className)}>
        <div className="flex-1 h-px bg-border" />
        <span className="text-xs text-muted-foreground font-medium whitespace-nowrap">
          {label}
        </span>
        <div className="flex-1 h-px bg-border" />
      </div>
    );
  }

  return (
    <div className={cn("h-px w-full bg-border", className)} />
  );
}
