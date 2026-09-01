"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Search, CornerDownLeft, FileSearch, Database } from "lucide-react";
import { SIDEBAR_ITEMS, type SidebarItem } from "./sidebar-items";
import { useDatasets } from "@/hooks/useAnalysis";
import { cn } from "@/utils/cn";

interface CommandMenuProps {
  open: boolean;
  onClose: () => void;
}

type Command =
  | { kind: "page"; item: SidebarItem }
  | { kind: "dataset"; id: string; filename: string };

function matchesCommand(query: string, cmd: Command, datasetNames: string[]): boolean {
  const q = query.toLowerCase().trim();
  if (!q) return true;
  if (cmd.kind === "page") {
    const { item } = cmd;
    const haystack = [
      item.label,
      item.section,
      item.description || "",
      ...(item.keywords || []),
    ]
      .join(" ")
      .toLowerCase();
    return haystack.includes(q);
  }
  const name = cmd.kind === "dataset" ? cmd.filename.toLowerCase() : "";
  return name.includes(q);
}

export function CommandMenu({ open, onClose }: CommandMenuProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);

  const { data: datasetsData } = useDatasets();
  const datasetNames = useMemo(
    () => (datasetsData?.datasets || []).map((d) => d.filename),
    [datasetsData],
  );

  const commands = useMemo<Command[]>(() => {
    const pages: Command[] = SIDEBAR_ITEMS.map((item) => ({ kind: "page", item }));
    const datasets: Command[] = (datasetsData?.datasets || []).map((d) => ({
      kind: "dataset",
      id: d.id,
      filename: d.filename,
    }));
    return [...pages, ...datasets];
  }, [datasetsData]);

  const filtered = useMemo(
    () => commands.filter((c) => matchesCommand(query, c, datasetNames)),
    [commands, query, datasetNames],
  );

  // Reset active index + focus on open.
  useEffect(() => {
    if (open) {
      setActiveIndex(0);
      setQuery("");
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  // Escape + keyboard navigation.
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((i) => Math.min(i + 1, filtered.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter") {
        e.preventDefault();
        const cmd = filtered[activeIndex];
        if (!cmd) return;
        if (cmd.kind === "page") {
          router.push(cmd.item.href);
        } else {
          router.push(`/datasets/${cmd.id}`);
        }
        onClose();
      }
    },
    [filtered, activeIndex, onClose, router],
  );

  // Body scroll lock while open.
  useEffect(() => {
    if (open) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [open]);

  if (!open) return null;

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-[15vh]">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.12 }}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: -8 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            role="dialog"
            aria-modal="true"
            aria-label="Command menu"
            className="relative w-full max-w-lg overflow-hidden rounded-xl border border-border bg-card shadow-popover"
            onKeyDown={handleKeyDown}
          >
            {/* Input */}
            <div className="flex items-center gap-3 border-b border-border px-4">
              <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setActiveIndex(0);
                }}
                placeholder="Search pages and datasets…"
                className="h-12 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                aria-label="Search pages and datasets"
              />
              <kbd className="shrink-0 rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                ESC
              </kbd>
            </div>

            {/* Results */}
            <div className="max-h-[40vh] overflow-y-auto py-1.5">
              {filtered.length === 0 && (
                <p className="px-4 py-6 text-center text-sm text-muted-foreground">
                  No results for &quot;{query}&quot;
                </p>
              )}

              {filtered.map((cmd, i) => {
                const isActive = i === activeIndex;
                const isPage = cmd.kind === "page";
                const label = isPage ? cmd.item.label : cmd.filename;
                const hint = isPage ? cmd.item.section : "Dataset";
                const Icon = isPage ? cmd.item.icon : Database;
                return (
                  <button
                    key={isPage ? cmd.item.href : cmd.id}
                    onMouseMove={() => setActiveIndex(i)}
                    onClick={() => {
                      if (isPage) router.push(cmd.item.href);
                      else router.push(`/datasets/${cmd.id}`);
                      onClose();
                    }}
                    className={cn(
                      "flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors",
                      isActive ? "bg-muted" : "",
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg",
                        isActive ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground",
                      )}
                    >
                      <Icon className="h-4 w-4" strokeWidth={isActive ? 2.5 : 2} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate">{label}</span>
                      <span className="block text-[11px] text-muted-foreground">{hint}</span>
                    </span>
                    {isActive && <CornerDownLeft className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />}
                  </button>
                );
              })}
            </div>

            {/* Footer hint */}
            <div className="flex items-center gap-4 border-t border-border bg-muted/30 px-4 py-2 text-[11px] text-muted-foreground">
              <span className="flex items-center gap-1">
                <kbd className="rounded border border-border bg-card px-1">↑</kbd>
                <kbd className="rounded border border-border bg-card px-1">↓</kbd>
                navigate
              </span>
              <span className="flex items-center gap-1">
                <kbd className="rounded border border-border bg-card px-1">↵</kbd>
                open
              </span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
