"use client";

import { cn } from "@/utils/cn";
import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface DropdownItem {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  variant?: "default" | "destructive";
  separator?: boolean;
}

interface DropdownMenuProps {
  trigger: React.ReactNode;
  items: DropdownItem[];
  align?: "start" | "end";
  className?: string;
  /** Called when the menu is toggled open/closed */
  onOpenChange?: (open: boolean) => void;
}

export function DropdownMenu({
  trigger,
  items,
  align = "end",
  className,
  onOpenChange,
}: DropdownMenuProps) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const setOpenState = (next: boolean) => {
    setOpen(next);
    onOpenChange?.(next);
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenState(false);
      }
    };
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  return (
    <div ref={menuRef} className="relative inline-block">
      {/* onClickCapture toggles the menu even if the trigger stops propagation */}
      <div onClickCapture={() => setOpenState(!open)}>{trigger}</div>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.96 }}
            transition={{ duration: 0.12 }}
            className={cn(
              "absolute z-50 mt-1 min-w-[180px] rounded-xl border border-border bg-card shadow-lg py-1",
              align === "end" ? "right-0" : "left-0",
              className,
            )}
          >
            {items.map((item, i) => (
              <div key={i}>
                {item.separator && i > 0 && (
                  <div className="mx-2 my-1 h-px bg-border" />
                )}
                <button
                  onClick={() => {
                    if (!item.disabled) {
                      item.onClick();
                      setOpen(false);
                    }
                  }}
                  disabled={item.disabled}
                  className={cn(
                    "flex w-full items-center gap-2 px-3 py-2 text-sm transition-colors",
                    item.variant === "destructive"
                      ? "text-destructive hover:bg-destructive/10"
                      : "text-foreground hover:bg-muted",
                    item.disabled && "opacity-50 cursor-not-allowed",
                  )}
                >
                  {item.icon && <span className="h-4 w-4">{item.icon}</span>}
                  {item.label}
                </button>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
