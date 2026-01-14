"use client";

import { useEffect, useRef, useCallback } from "react";

// Sync configuration
const SYNC_INTERVAL_MS = 15 * 60 * 1000; // 15 minutes
const MIN_SYNC_INTERVAL_MS = 5 * 60 * 1000; // Don't sync more than once every 5 minutes
const STALE_THRESHOLD_MS = 30 * 60 * 1000; // Consider data stale after 30 minutes

const LAST_SYNC_KEY = "rewind:lastSyncTime";

/**
 * Hook that automatically syncs content:
 * 1. On initial app load if data is stale
 * 2. When the app becomes visible after being hidden
 * 3. Periodically while the app is open
 */
export function useAutoSync() {
  const syncInProgressRef = useRef(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const getLastSyncTime = useCallback((): number => {
    if (typeof window === "undefined") return 0;
    const stored = localStorage.getItem(LAST_SYNC_KEY);
    return stored ? parseInt(stored, 10) : 0;
  }, []);

  const setLastSyncTime = useCallback((time: number) => {
    if (typeof window === "undefined") return;
    localStorage.setItem(LAST_SYNC_KEY, time.toString());
  }, []);

  const shouldSync = useCallback((): boolean => {
    const lastSync = getLastSyncTime();
    const now = Date.now();
    return now - lastSync >= MIN_SYNC_INTERVAL_MS;
  }, [getLastSyncTime]);

  const isDataStale = useCallback((): boolean => {
    const lastSync = getLastSyncTime();
    const now = Date.now();
    return now - lastSync >= STALE_THRESHOLD_MS;
  }, [getLastSyncTime]);

  const triggerSync = useCallback(async (force = false) => {
    // Prevent concurrent syncs
    if (syncInProgressRef.current) {
      return;
    }

    // Don't sync if offline
    if (!navigator.onLine) {
      console.log("[AutoSync] Skipping sync - offline");
      return;
    }

    // Check if we should sync (respect minimum interval) unless forced
    if (!force && !shouldSync()) {
      return;
    }

    syncInProgressRef.current = true;

    try {
      const cronSecret = process.env.NEXT_PUBLIC_CRON_SECRET || "rewind-cron-secret-change-in-production";
      const response = await fetch(`/api/sync?trigger=true&secret=${cronSecret}`, {
        method: "GET",
      });

      if (response.ok) {
        setLastSyncTime(Date.now());
        console.log("[AutoSync] Sync completed successfully");
      } else {
        console.error("[AutoSync] Sync failed:", response.status);
      }
    } catch (error) {
      console.error("[AutoSync] Sync error:", error);
    } finally {
      syncInProgressRef.current = false;
    }
  }, [shouldSync, setLastSyncTime]);

  // Handle visibility change (user switches back to tab)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && isDataStale()) {
        console.log("[AutoSync] App became visible, data is stale, syncing...");
        triggerSync();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [isDataStale, triggerSync]);

  // Handle focus (user clicks back into window)
  useEffect(() => {
    const handleFocus = () => {
      if (isDataStale()) {
        console.log("[AutoSync] Window focused, data is stale, syncing...");
        triggerSync();
      }
    };

    window.addEventListener("focus", handleFocus);

    return () => {
      window.removeEventListener("focus", handleFocus);
    };
  }, [isDataStale, triggerSync]);

  // Initial sync on mount if data is stale
  useEffect(() => {
    if (isDataStale()) {
      console.log("[AutoSync] Initial load, data is stale, syncing...");
      // Delay initial sync slightly to not block app startup
      const timeout = setTimeout(triggerSync, 2000);
      return () => clearTimeout(timeout);
    }
  }, [isDataStale, triggerSync]);

  // Periodic sync while app is open
  useEffect(() => {
    intervalRef.current = setInterval(() => {
      if (document.visibilityState === "visible") {
        console.log("[AutoSync] Periodic sync triggered");
        triggerSync();
      }
    }, SYNC_INTERVAL_MS);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [triggerSync]);

  // Sync when coming back online
  useEffect(() => {
    const handleOnline = () => {
      if (isDataStale()) {
        console.log("[AutoSync] Device came online, syncing...");
        triggerSync();
      }
    };

    window.addEventListener("online", handleOnline);

    return () => {
      window.removeEventListener("online", handleOnline);
    };
  }, [isDataStale, triggerSync]);

  return { triggerSync, isDataStale, getLastSyncTime };
}
