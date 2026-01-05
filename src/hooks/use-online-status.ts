"use client";

import { useState, useEffect, useCallback } from "react";
import { useOfflineStore } from "@/stores/offline-store";

interface UseOnlineStatusOptions {
  pollingInterval?: number;
  pingUrl?: string;
}

/**
 * Hook to detect online/offline status with polling support
 */
export function useOnlineStatus(options: UseOnlineStatusOptions = {}) {
  const { pollingInterval = 30000, pingUrl = "/api/health" } = options;

  const { isOnline, setOnlineStatus } = useOfflineStore();
  const [isChecking, setIsChecking] = useState(false);

  const checkConnection = useCallback(async () => {
    setIsChecking(true);
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(pingUrl, {
        method: "HEAD",
        signal: controller.signal,
        cache: "no-store",
      });

      clearTimeout(timeout);

      if (response.ok) {
        setOnlineStatus(true);
        return true;
      }
    } catch {
      // Connection check failed
    } finally {
      setIsChecking(false);
    }

    // Fall back to navigator.onLine
    setOnlineStatus(navigator.onLine);
    return navigator.onLine;
  }, [pingUrl, setOnlineStatus]);

  useEffect(() => {
    const handleOnline = () => {
      setOnlineStatus(true);
    };

    const handleOffline = () => {
      setOnlineStatus(false);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Periodic connection check
    const interval = setInterval(checkConnection, pollingInterval);

    // Initial check
    checkConnection();

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      clearInterval(interval);
    };
  }, [checkConnection, pollingInterval, setOnlineStatus]);

  return {
    isOnline,
    isChecking,
    checkConnection,
  };
}
