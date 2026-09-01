"use client";

import { cn } from "@/utils/cn";

interface LoadingScreenProps {
  message?: string;
  className?: string;
  spinnerSize?: "sm" | "md" | "lg";
}

export function LoadingScreen({
  message = "Loading...",
  className,
  spinnerSize = "md",
}: LoadingScreenProps) {
  const sizeClasses = {
    sm: "h-6 w-6",
    md: "h-10 w-10",
    lg: "h-14 w-14",
  };

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center min-h-[400px] gap-4",
        className,
      )}
    >
      <div className="relative">
        <div
          className={cn(
            "animate-spin rounded-full border-2 border-border",
            sizeClasses[spinnerSize],
          )}
        />
        <div
          className={cn(
            "absolute inset-0 animate-spin rounded-full border-2 border-t-primary border-r-transparent border-b-transparent border-l-transparent",
            sizeClasses[spinnerSize],
          )}
          style={{ animationDuration: "0.6s" }}
        />
      </div>
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}

export function InlineLoader({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-2 text-sm text-muted-foreground", className)}>
      <svg className="animate-spin h-4 w-4 text-primary" viewBox="0 0 24 24" fill="none">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
      </svg>
      <span>Processing...</span>
    </div>
  );
}
