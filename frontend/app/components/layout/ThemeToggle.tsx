"use client";

import { useTheme } from "@/hooks/useTheme";
import { Sun, Moon, Monitor } from "lucide-react";
import { cn } from "@/utils/cn";

interface ThemeToggleProps {
  className?: string;
}

/**
 * Top-bar theme toggle. Cycles light → dark → system and persists via useTheme.
 */
export function ThemeToggle({ className }: ThemeToggleProps) {
  const { theme, setTheme } = useTheme();

  const Icon = theme === "dark" ? Moon : theme === "light" ? Sun : Monitor;
  const label = `Theme: ${theme}`;

  return (
    <button
      type="button"
      onClick={() => {
        const next = theme === "light" ? "dark" : theme === "dark" ? "system" : "light";
        setTheme(next);
      }}
      aria-label={label}
      title={label}
      className={cn(
        "flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors",
        className,
      )}
    >
      <Icon className="h-4 w-4" strokeWidth={2} />
    </button>
  );
}
