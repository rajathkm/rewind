"use client";

import { useIsDesktop } from "@/hooks/use-media-query";
import { useMiniPlayerVisible } from "@/stores/audio-store";
import { Sidebar } from "./sidebar";
import { BottomNav } from "./bottom-nav";
import { Header } from "./header";
import { MiniPlayer } from "@/components/audio/mini-player";
import { OfflineIndicator } from "@/components/offline/offline-indicator";
import { cn } from "@/lib/utils/cn";
import { useUIStore } from "@/stores/ui-store";

interface ResponsiveShellProps {
  children: React.ReactNode;
}

export function ResponsiveShell({ children }: ResponsiveShellProps) {
  const isDesktop = useIsDesktop();
  const miniPlayerVisible = useMiniPlayerVisible();
  const { sidebarCollapsed } = useUIStore();

  return (
    <div className="min-h-screen bg-background">
      {/* Offline Indicator */}
      <OfflineIndicator />

      {/* Header */}
      <Header />

      <div className="flex">
        {/* Desktop Sidebar */}
        {isDesktop && (
          <Sidebar
            className={cn(
              "fixed left-0 top-14 h-[calc(100vh-3.5rem)]",
              sidebarCollapsed ? "w-16" : "w-64"
            )}
          />
        )}

        {/* Main Content */}
        <main
          className={cn(
            "flex-1 min-h-[calc(100vh-3.5rem)]",
            isDesktop && (sidebarCollapsed ? "ml-16" : "ml-64"),
            miniPlayerVisible && "pb-20", // Space for mini player
            !isDesktop && "pb-16" // Space for bottom nav on mobile
          )}
        >
          <div className="container mx-auto px-4 py-6 max-w-5xl">
            {children}
          </div>
        </main>
      </div>

      {/* Mini Audio Player */}
      {miniPlayerVisible && (
        <MiniPlayer
          className={cn(
            "fixed left-0 right-0 z-40",
            isDesktop
              ? sidebarCollapsed
                ? "bottom-0 left-16"
                : "bottom-0 left-64"
              : "bottom-16"
          )}
        />
      )}

      {/* Mobile Bottom Navigation */}
      {!isDesktop && (
        <BottomNav className="fixed bottom-0 left-0 right-0 z-50" />
      )}
    </div>
  );
}
