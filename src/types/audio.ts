/**
 * Audio player type definitions
 */

export interface PodcastEpisode {
  id: string;
  podcastId: string;
  podcastName: string;
  episodeTitle: string;
  description?: string;
  coverUrl: string;
  audioUrl: string;
  duration: number; // seconds
  publishedAt?: Date;
  savedPosition?: number; // seconds
}

export interface AudioPlaybackState {
  currentEpisode: PodcastEpisode | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  playbackRate: number;
  isBuffering: boolean;
  error: string | null;
}

export interface AudioQueueState {
  queue: PodcastEpisode[];
  queueIndex: number;
  shuffleEnabled: boolean;
  repeatMode: "none" | "one" | "all";
}

export interface SleepTimerState {
  isActive: boolean;
  endTime: Date | null;
  remainingMinutes: number | null;
}

export interface DownloadedEpisode {
  id: string;
  podcastId: string;
  title: string;
  audioBlob: Blob;
  duration: number;
  fileSize: number;
  downloadedAt: Date;
  lastPlayedAt?: Date;
  playbackPosition?: number;
}

export interface DownloadProgress {
  id: string;
  url: string;
  status: "pending" | "downloading" | "completed" | "failed" | "cancelled";
  progress: number; // 0-100
  error?: string;
  startedAt?: Date;
  completedAt?: Date;
}

export type PlaybackRate = 0.5 | 0.75 | 1 | 1.25 | 1.5 | 1.75 | 2 | 2.5 | 3;

export const PLAYBACK_RATES: PlaybackRate[] = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2, 2.5, 3];
