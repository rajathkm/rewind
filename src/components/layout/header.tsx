"use client";

import Link from "next/link";
import { Menu, PanelLeftClose, PanelLeft, Bell, Plus, Search, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { RewindIcon } from "@/components/ui/rewind-icon";
import { useUIStore } from "@/stores/ui-store";
import { useIsDesktop } from "@/hooks/use-media-query";
import { useOnlineStatus } from "@/hooks/use-online-status";
import { cn } from "@/lib/utils/cn";

interface HeaderProps {
  className?: string;
}

export function Header({ className }: HeaderProps) {
  const isDesktop = useIsDesktop();
  const { isOnline } = useOnlineStatus();
  const {
    sidebarCollapsed,
    toggleSidebar,
    mobileMenuOpen,
    setMobileMenuOpen,
  } = useUIStore();

  return (
    <header
      className={cn(
        "h-16 border-b border-border/50",
        "bg-background/80 backdrop-blur-xl backdrop-saturate-150",
        "sticky top-0 z-40 safe-area-top",
        "transition-all duration-300",
        className
      )}
    >
      <div className="flex items-center justify-between h-full px-4 lg:px-6">
        {/* Left section */}
        <div className="flex items-center gap-3">
          {isDesktop ? (
            // Desktop: Sidebar toggle
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={toggleSidebar}
              aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              className="text-muted-foreground hover:text-foreground"
            >
              {sidebarCollapsed ? (
                <PanelLeft className="h-5 w-5" />
              ) : (
                <PanelLeftClose className="h-5 w-5" />
              )}
            </Button>
          ) : (
            // Mobile: Menu button and logo
            <>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                aria-label="Open menu"
                className="text-muted-foreground hover:text-foreground"
              >
                <Menu className="h-5 w-5" />
              </Button>
              <Link href="/" className="flex items-center gap-2.5 group">
                <div className="relative">
                  <RewindIcon size="sm" className="group-hover:shadow-xl group-hover:shadow-primary/30 transition-all duration-300" />
                  <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-[hsl(var(--gradient-start))] to-[hsl(var(--gradient-end))] blur-lg opacity-40 -z-10 group-hover:opacity-60 transition-opacity" />
                </div>
                <span className="font-bold text-lg tracking-tight">Rewind</span>
              </Link>
            </>
          )}
        </div>

        {/* Center - Search bar (desktop) */}
        {isDesktop && (
          <div className="flex-1 max-w-md mx-8">
            <Link href="/search" className="block">
              <div className="flex items-center gap-3 h-11 px-4 rounded-xl border-2 border-transparent bg-muted/50 hover:bg-muted hover:border-border/50 transition-all duration-200 group">
                <Search className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">
                  Search content...
                </span>
                <kbd className="ml-auto hidden sm:inline-flex h-6 items-center gap-1 rounded-md border bg-background px-2 text-[10px] font-medium text-muted-foreground">
                  <span className="text-xs">⌘</span>K
                </kbd>
              </div>
            </Link>
          </div>
        )}

        {/* Right section */}
        <div className="flex items-center gap-1.5">
          {!isOnline && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-destructive/10 text-destructive text-xs font-medium mr-2 animate-pulse-subtle">
              <WifiOff className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Offline</span>
            </div>
          )}

          {!isDesktop && (
            <Button asChild variant="ghost" size="icon-sm" className="text-muted-foreground hover:text-foreground">
              <Link href="/search" aria-label="Search">
                <Search className="h-5 w-5" />
              </Link>
            </Button>
          )}

          {!isDesktop && (
            <Button asChild variant="ghost" size="icon-sm" className="text-muted-foreground hover:text-foreground">
              <Link href="/subscriptions?add=true" aria-label="Add source">
                <Plus className="h-5 w-5" />
              </Link>
            </Button>
          )}

          {/* Theme Toggle */}
          <ThemeToggle className="text-muted-foreground hover:text-foreground" />

          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Notifications"
            className="relative text-muted-foreground hover:text-foreground"
          >
            <Bell className="h-5 w-5" />
            {/* Notification indicator */}
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-accent animate-pulse" />
          </Button>

          {isDesktop && (
            <Button asChild variant="gradient" size="sm" className="ml-2">
              <Link href="/subscriptions?add=true">
                <Plus className="h-4 w-4" />
                <span>Add Source</span>
              </Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
