"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/utils/cn";
import {
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  Bot,
  Search,
  ChevronRight as CrumbChevron,
  Command,
} from "lucide-react";
import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Avatar } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { NAV_SECTIONS, getCurrentItem } from "./sidebar-items";
import { CommandMenu } from "./CommandMenu";
import { ThemeToggle } from "./ThemeToggle";

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);

  const toggleSidebar = useCallback(() => {
    setSidebarCollapsed((prev) => !prev);
  }, []);

  // Global Ctrl+K / Cmd+K to open the command palette.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCommandOpen((v) => !v);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  const currentItem = getCurrentItem(pathname);
  const section = currentItem?.section || "Workspace";
  const activeHref = currentItem?.href || "/";

  const sidebarContent = (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-brand-violet shadow-sm">
          <Bot className="h-5 w-5 text-primary-foreground" strokeWidth={2} />
        </div>
        {!sidebarCollapsed && (
          <div className="flex flex-col">
            <span className="text-sm font-semibold leading-tight">Data Analyst</span>
            <span className="text-[10px] text-muted-foreground">Enterprise Suite</span>
          </div>
        )}
      </div>

      <Separator />

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 scrollbar-thin">
        {NAV_SECTIONS.map((group) => (
          <div key={group.section} className="mb-4">
            {!sidebarCollapsed && (
              <p className="px-2 mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                {group.section}
              </p>
            )}
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const isActive =
                  pathname === item.href || pathname.startsWith(item.href + "/");
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    aria-current={isActive ? "page" : undefined}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200 group",
                      isActive
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
                    )}
                  >
                    <item.icon
                      className={cn(
                        "h-4 w-4 shrink-0 transition-colors",
                        isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground",
                      )}
                      strokeWidth={isActive ? 2.5 : 2}
                    />
                    {!sidebarCollapsed && (
                      <>
                        <span className="truncate">{item.label}</span>
                        {item.badge !== undefined && (
                          <span className="ml-auto inline-flex items-center justify-center rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                            {item.badge}
                          </span>
                        )}
                      </>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <Separator />

      {/* User section */}
      <div className="p-4">
        <div className="flex items-center gap-3">
          <Avatar name="User" size="sm" />
          {!sidebarCollapsed && (
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-medium truncate">Admin User</span>
              <span className="text-[10px] text-muted-foreground truncate">admin@data.ai</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const sidebarWidth = sidebarCollapsed ? "w-16" : "w-60";

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/50 lg:hidden"
            onClick={() => setMobileOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Desktop sidebar */}
      <aside
        className={cn(
          "fixed left-0 top-0 z-30 hidden h-screen flex-col border-r border-border bg-card transition-all duration-300 lg:flex",
          sidebarWidth,
        )}
      >
        {sidebarContent}
        {/* Collapse toggle */}
        <button
          onClick={toggleSidebar}
          aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="absolute -right-3 top-20 flex h-6 w-6 items-center justify-center rounded-full border border-border bg-card shadow-sm hover:bg-muted transition-colors"
        >
          {sidebarCollapsed ? (
            <ChevronRight className="h-3 w-3" />
          ) : (
            <ChevronLeft className="h-3 w-3" />
          )}
        </button>
      </aside>

      {/* Mobile sidebar */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.aside
            initial={{ x: -300 }}
            animate={{ x: 0 }}
            exit={{ x: -300 }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed inset-y-0 left-0 z-50 w-72 border-r border-border bg-card lg:hidden"
          >
            <div className="flex items-center justify-between p-4">
              <span className="text-sm font-semibold">Navigation</span>
              <button
                onClick={() => setMobileOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-muted"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            {sidebarContent}
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Command palette */}
      <CommandMenu open={commandOpen} onClose={() => setCommandOpen(false)} />

      {/* Main content */}
      <div
        className={cn(
          "transition-all duration-300",
          "lg:ml-60",
          sidebarCollapsed && "lg:ml-16",
        )}
      >
        {/* Top bar */}
        <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-border bg-background/80 backdrop-blur-lg px-4 lg:px-6">
          <button
            onClick={() => setMobileOpen(true)}
            aria-label="Open navigation"
            className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-muted lg:hidden"
          >
            <Menu className="h-4 w-4" />
          </button>

          {/* Breadcrumb */}
          <div className="flex min-w-0 items-center gap-1.5 text-sm" aria-label="Breadcrumb">
            <span className="hidden sm:inline text-muted-foreground">{section}</span>
            {currentItem && (
              <>
                <CrumbChevron className="hidden sm:inline h-3.5 w-3.5 text-muted-foreground/50" />
                <span className="truncate font-medium">{currentItem.label}</span>
              </>
            )}
          </div>

          <div className="flex-1" />

          {/* Top bar actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCommandOpen(true)}
              aria-label="Open command menu (Ctrl+K)"
              className="hidden md:flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              <Search className="h-3.5 w-3.5" />
              <span>Search…</span>
              <kbd className="flex items-center gap-0.5 rounded border border-border bg-card px-1 py-0.5 text-[10px]">
                <Command className="h-2.5 w-2.5" />K
              </kbd>
            </button>
            <button
              onClick={() => setCommandOpen(true)}
              aria-label="Open command menu"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground md:hidden"
            >
              <Search className="h-4 w-4" />
            </button>

            <ThemeToggle />

            <div className="hidden lg:flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-1.5">
              <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs text-muted-foreground">All Systems Normal</span>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="min-h-[calc(100vh-3.5rem)]">
          {/* Scroll-margin so sticky headers don't overlap anchored sections */}
          <div id="content" className="scroll-mt-14">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
