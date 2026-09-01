"use client";

import { cn } from "@/utils/cn";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LucideIcon, ArrowRight, CheckCircle2, Circle, Clock } from "lucide-react";

export type StepStatus = "completed" | "in_progress" | "pending" | "skipped";

interface ProgressCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  status: StepStatus;
  actionLabel: string;
  onAction: () => void;
  stepNumber: number;
  badge?: string;
  disabled?: boolean;
  className?: string;
}

const statusConfig: Record<StepStatus, { icon: LucideIcon; className: string; label: string }> = {
  completed: {
    icon: CheckCircle2,
    className: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20",
    label: "Completed",
  },
  in_progress: {
    icon: Clock,
    className: "text-primary bg-primary/10 border-primary/20",
    label: "In Progress",
  },
  pending: {
    icon: Circle,
    className: "text-muted-foreground bg-muted/50 border-border",
    label: "Pending",
  },
  skipped: {
    icon: Circle,
    className: "text-muted-foreground/40 bg-muted/30 border-border/50",
    label: "Skipped",
  },
};

export function ProgressCard({
  icon: Icon,
  title,
  description,
  status,
  actionLabel,
  onAction,
  stepNumber,
  badge,
  disabled = false,
  className,
}: ProgressCardProps) {
  const config = statusConfig[status];
  const StatusIcon = config.icon;

  return (
    <Card
      className={cn(
        "group relative overflow-hidden transition-all duration-200 hover:shadow-md",
        status === "in_progress" && "border-primary/30 shadow-sm",
        status === "completed" && "border-emerald-500/20",
        disabled && "opacity-60 pointer-events-none",
        className,
      )}
    >
      {/* Status indicator bar */}
      <div
        className={cn(
          "absolute left-0 top-0 bottom-0 w-1",
          status === "completed" && "bg-emerald-500",
          status === "in_progress" && "bg-primary",
          status === "pending" && "bg-muted-foreground/20",
          status === "skipped" && "bg-muted-foreground/10",
        )}
      />

      <CardContent className="p-5 pl-6">
        <div className="flex items-start gap-4">
          {/* Step number */}
          <div
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border text-sm font-bold transition-colors",
              config.className,
            )}
          >
            {status === "completed" ? (
              <CheckCircle2 className="h-5 w-5" />
            ) : (
              <span>{stepNumber}</span>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <Icon className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
              <h3 className="text-sm font-semibold">{title}</h3>
              {badge && (
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                  {badge}
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed mb-3">{description}</p>

            <div className="flex items-center justify-between">
              <span
                className={cn(
                  "inline-flex items-center gap-1 text-[10px] font-medium uppercase tracking-wider",
                  status === "completed" && "text-emerald-500",
                  status === "in_progress" && "text-primary",
                  (status === "pending" || status === "skipped") && "text-muted-foreground/50",
                )}
              >
                <StatusIcon className="h-3 w-3" />
                {config.label}
              </span>

              <Button
                size="sm"
                variant={status === "in_progress" ? "default" : "outline"}
                onClick={onAction}
                disabled={disabled}
                className="h-8 text-xs"
              >
                {actionLabel}
                <ArrowRight className="ml-1.5 h-3 w-3" />
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
