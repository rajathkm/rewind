"use client";

import { useEffect, useState } from "react";
import { WifiOff, Wifi, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useOfflineStore } from "@/stores/offline-store";
import { cn } from "@/lib/utils/cn";

export function OfflineIndicator() {
  const { isOnline, setOnlineStatus } = useOfflineStore();
  const [showBanner, setShowBanner] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [wasOffline, setWasOffline] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setOnlineStatus(true);
      if (wasOffline) {
        setShowBanner(true);
        // Auto-hide after 3 seconds when coming back online
        setTimeout(() => setShowBanner(false), 3000);
      }
      setWasOffline(false);
    };

    const handleOffline = () => {
      setOnlineStatus(false);
      setWasOffline(true);
      setShowBanner(true);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Set initial state
    if (!navigator.onLine) {
      setOnlineStatus(false);
      setWasOffline(true);
      setShowBanner(true);
    }

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [setOnlineStatus, wasOffline]);

  const handleRetry = async () => {
    setIsReconnecting(true);
    try {
      // Try to fetch a small resource to verify connection
      const response = await fetch("/api/health", {
        method: "HEAD",
        cache: "no-store",
      });
      if (response.ok) {
        setOnlineStatus(true);
        setShowBanner(false);
        setWasOffline(false);
      }
    } catch {
      // Still offline
    } finally {
      setIsReconnecting(false);
    }
  };

  const handleDismiss = () => {
    if (isOnline) {
      setShowBanner(false);
    }
  };

  if (!showBanner) return null;

  return (
    <div
      className={cn(
        "fixed top-14 left-0 right-0 z-50 px-4 py-2 text-sm transition-all animate-slide-up",
        isOnline
          ? "bg-green-500/95 text-white"
          : "bg-amber-500/95 text-white"
      )}
      role="alert"
    >
      <div className="container mx-auto max-w-5xl flex items-center justify-center gap-2">
        {isOnline ? (
          <>
            <Wifi className="w-4 h-4" />
            <span>Back online</span>
            <Button
              variant="ghost"
              size="sm"
              className="ml-2 h-6 text-white hover:text-white hover:bg-white/20"
              onClick={handleDismiss}
            >
              Dismiss
            </Button>
          </>
        ) : (
          <>
            <WifiOff className="w-4 h-4" />
            <span>You&apos;re offline. Some features may be limited.</span>
            <Button
              variant="ghost"
              size="sm"
              className="ml-2 h-6 text-white hover:text-white hover:bg-white/20"
              onClick={handleRetry}
              disabled={isReconnecting}
            >
              {isReconnecting ? (
                <RefreshCw className="w-3 h-3 animate-spin" />
              ) : (
                "Retry"
              )}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
