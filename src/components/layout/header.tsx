"use client";

import Link from "next/link";
import { Menu, PanelLeftClose, PanelLeft, Bell, Plus, Search, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
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
        "h-14 border-b bg-background/95 backdrop-blur-lg supports-[backdrop-filter]:bg-background/60",
        "sticky top-0 z-40 safe-area-top",
        className
      )}
    >
      <div className="flex items-center justify-between h-full px-4">
        {/* Left section */}
        <div className="flex items-center gap-2">
          {isDesktop ? (
            // Desktop: Sidebar toggle
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleSidebar}
              aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
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
                size="icon"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                aria-label="Open menu"
              >
                <Menu className="h-5 w-5" />
              </Button>
              <Link href="/" className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
                  <span className="text-primary-foreground font-bold text-xs">
                    R
                  </span>
                </div>
                <span className="font-semibold">Rewind</span>
              </Link>
            </>
          )}
        </div>

        {/* Right section */}
        <div className="flex items-center gap-2">
          {!isOnline && (
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-destructive/10 text-destructive text-xs font-medium">
              <WifiOff className="h-3 w-3" />
              <span className="hidden sm:inline">Offline</span>
            </div>
          )}
          <Button asChild variant="ghost" size="icon">
            <Link href="/search" aria-label="Search">
              <Search className="h-5 w-5" />
            </Link>
          </Button>
          {!isDesktop && (
            <Button asChild variant="ghost" size="icon">
              <Link href="/subscriptions?add=true" aria-label="Add source">
                <Plus className="h-5 w-5" />
              </Link>
            </Button>
          )}
          <Button variant="ghost" size="icon" aria-label="Notifications">
            <Bell className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </header>
  );
}
