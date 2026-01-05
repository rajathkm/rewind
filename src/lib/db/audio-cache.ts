import { openDB, DBSchema, IDBPDatabase } from "idb";
import type { DownloadedEpisode } from "@/types/audio";

interface RewindAudioDB extends DBSchema {
  "audio-files": {
    key: string;
    value: DownloadedEpisode;
    indexes: {
      "by-podcast": string;
      "by-download-date": Date;
    };
  };
  "playback-progress": {
    key: string;
    value: {
      id: string;
      position: number;
      duration: number;
      updatedAt: Date;
    };
  };
}

class AudioCacheManager {
  private db: IDBPDatabase<RewindAudioDB> | null = null;
  private dbName = "rewind-audio-cache";
  private version = 1;
  private initPromise: Promise<void> | null = null;

  async init(): Promise<void> {
    if (this.db) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = (async () => {
      this.db = await openDB<RewindAudioDB>(this.dbName, this.version, {
        upgrade(db) {
          // Audio files store
          if (!db.objectStoreNames.contains("audio-files")) {
            const audioStore = db.createObjectStore("audio-files", {
              keyPath: "id",
            });
            audioStore.createIndex("by-podcast", "podcastId");
            audioStore.createIndex("by-download-date", "downloadedAt");
          }

          // Playback progress store
          if (!db.objectStoreNames.contains("playback-progress")) {
            db.createObjectStore("playback-progress", { keyPath: "id" });
          }
        },
      });
    })();

    return this.initPromise;
  }

  async saveAudio(
    episodeId: string,
    podcastId: string,
    title: string,
    audioBlob: Blob,
    duration: number
  ): Promise<void> {
    await this.init();

    await this.db!.put("audio-files", {
      id: episodeId,
      podcastId,
      title,
      audioBlob,
      duration,
      fileSize: audioBlob.size,
      downloadedAt: new Date(),
    });
  }

  async getAudio(episodeId: string): Promise<Blob | null> {
    await this.init();
    const record = await this.db!.get("audio-files", episodeId);
    return record?.audioBlob ?? null;
  }

  async getAudioMetadata(episodeId: string): Promise<DownloadedEpisode | null> {
    await this.init();
    const record = await this.db!.get("audio-files", episodeId);
    return record ?? null;
  }

  async hasAudio(episodeId: string): Promise<boolean> {
    await this.init();
    const record = await this.db!.get("audio-files", episodeId);
    return !!record;
  }

  async deleteAudio(episodeId: string): Promise<void> {
    await this.init();
    await this.db!.delete("audio-files", episodeId);
    await this.db!.delete("playback-progress", episodeId);
  }

  async getAllDownloads(): Promise<DownloadedEpisode[]> {
    await this.init();
    return this.db!.getAll("audio-files");
  }

  async getDownloadsByPodcast(podcastId: string): Promise<DownloadedEpisode[]> {
    await this.init();
    return this.db!.getAllFromIndex("audio-files", "by-podcast", podcastId);
  }

  async savePlaybackProgress(
    episodeId: string,
    position: number,
    duration: number
  ): Promise<void> {
    await this.init();
    await this.db!.put("playback-progress", {
      id: episodeId,
      position,
      duration,
      updatedAt: new Date(),
    });
  }

  async getPlaybackProgress(
    episodeId: string
  ): Promise<{ position: number; duration: number } | null> {
    await this.init();
    const record = await this.db!.get("playback-progress", episodeId);
    return record ? { position: record.position, duration: record.duration } : null;
  }

  async getStorageUsage(): Promise<{ used: number; quota: number }> {
    if (navigator.storage && navigator.storage.estimate) {
      const estimate = await navigator.storage.estimate();
      return {
        used: estimate.usage ?? 0,
        quota: estimate.quota ?? 0,
      };
    }
    return { used: 0, quota: 0 };
  }

  async requestPersistentStorage(): Promise<boolean> {
    if (navigator.storage && navigator.storage.persist) {
      return navigator.storage.persist();
    }
    return false;
  }

  async getTotalCacheSize(): Promise<number> {
    await this.init();
    const downloads = await this.db!.getAll("audio-files");
    return downloads.reduce((total, d) => total + d.fileSize, 0);
  }

  async clearAllCache(): Promise<void> {
    await this.init();
    await this.db!.clear("audio-files");
    await this.db!.clear("playback-progress");
  }
}

// Singleton instance
export const audioCacheManager = new AudioCacheManager();

// Helper function to download audio with progress tracking
export async function downloadAudioWithProgress(
  url: string,
  onProgress: (progress: number) => void
): Promise<Blob> {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to download: ${response.status}`);
  }

  const contentLength = response.headers.get("content-length");
  const total = contentLength ? parseInt(contentLength, 10) : 0;

  if (!response.body) {
    throw new Error("No response body");
  }

  const reader = response.body.getReader();
  const chunks: BlobPart[] = [];
  let received = 0;

  while (true) {
    const { done, value } = await reader.read();

    if (done) break;

    chunks.push(value);
    received += value.length;

    if (total > 0) {
      onProgress((received / total) * 100);
    }
  }

  return new Blob(chunks, {
    type: response.headers.get("content-type") || "audio/mpeg",
  });
}
