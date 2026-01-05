import { create } from "zustand";
import type { DownloadProgress } from "@/types/audio";

interface OfflineState {
  // Connection status
  isOnline: boolean;
  lastOnlineAt: Date | null;

  // Downloads
  downloads: Map<string, DownloadProgress>;
  activeDownloads: number;

  // Storage info
  storageUsed: number;
  storageQuota: number;
  isPersistent: boolean;

  // Actions
  setOnlineStatus: (status: boolean) => void;
  startDownload: (id: string, url: string) => void;
  updateDownloadProgress: (id: string, progress: number) => void;
  completeDownload: (id: string) => void;
  failDownload: (id: string, error: string) => void;
  cancelDownload: (id: string) => void;
  removeDownload: (id: string) => void;
  updateStorageInfo: (used: number, quota: number, persistent: boolean) => void;
}

export const useOfflineStore = create<OfflineState>((set, get) => ({
  // Initial state
  isOnline: typeof navigator !== "undefined" ? navigator.onLine : true,
  lastOnlineAt: null,
  downloads: new Map(),
  activeDownloads: 0,
  storageUsed: 0,
  storageQuota: 0,
  isPersistent: false,

  // Actions
  setOnlineStatus: (status) =>
    set({
      isOnline: status,
      lastOnlineAt: status ? new Date() : get().lastOnlineAt,
    }),

  startDownload: (id, url) =>
    set((state) => {
      const downloads = new Map(state.downloads);
      downloads.set(id, {
        id,
        url,
        status: "pending",
        progress: 0,
        startedAt: new Date(),
      });
      return {
        downloads,
        activeDownloads: state.activeDownloads + 1,
      };
    }),

  updateDownloadProgress: (id, progress) =>
    set((state) => {
      const downloads = new Map(state.downloads);
      const download = downloads.get(id);
      if (download) {
        downloads.set(id, {
          ...download,
          status: "downloading",
          progress,
        });
      }
      return { downloads };
    }),

  completeDownload: (id) =>
    set((state) => {
      const downloads = new Map(state.downloads);
      const download = downloads.get(id);
      if (download) {
        downloads.set(id, {
          ...download,
          status: "completed",
          progress: 100,
          completedAt: new Date(),
        });
      }
      return {
        downloads,
        activeDownloads: Math.max(0, state.activeDownloads - 1),
      };
    }),

  failDownload: (id, error) =>
    set((state) => {
      const downloads = new Map(state.downloads);
      const download = downloads.get(id);
      if (download) {
        downloads.set(id, {
          ...download,
          status: "failed",
          error,
        });
      }
      return {
        downloads,
        activeDownloads: Math.max(0, state.activeDownloads - 1),
      };
    }),

  cancelDownload: (id) =>
    set((state) => {
      const downloads = new Map(state.downloads);
      const download = downloads.get(id);
      if (download && download.status === "downloading") {
        downloads.set(id, {
          ...download,
          status: "cancelled",
        });
        return {
          downloads,
          activeDownloads: Math.max(0, state.activeDownloads - 1),
        };
      }
      return { downloads };
    }),

  removeDownload: (id) =>
    set((state) => {
      const downloads = new Map(state.downloads);
      const download = downloads.get(id);
      const wasActive =
        download?.status === "downloading" || download?.status === "pending";
      downloads.delete(id);
      return {
        downloads,
        activeDownloads: wasActive
          ? Math.max(0, state.activeDownloads - 1)
          : state.activeDownloads,
      };
    }),

  updateStorageInfo: (used, quota, persistent) =>
    set({
      storageUsed: used,
      storageQuota: quota,
      isPersistent: persistent,
    }),
}));

// Selectors
export const useIsOffline = () => useOfflineStore((state) => !state.isOnline);

export const useActiveDownloads = () =>
  useOfflineStore((state) =>
    Array.from(state.downloads.values()).filter(
      (d) => d.status === "downloading" || d.status === "pending"
    )
  );

export const useDownloadProgress = (id: string) =>
  useOfflineStore((state) => state.downloads.get(id));
