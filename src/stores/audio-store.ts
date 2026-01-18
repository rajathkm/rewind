import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { PodcastEpisode, PlaybackRate } from "@/types/audio";

interface AudioState {
  // Current playback
  currentEpisode: PodcastEpisode | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  playbackRate: PlaybackRate;
  isBuffering: boolean;
  error: string | null;

  // Queue
  queue: PodcastEpisode[];
  queueIndex: number;

  // Sleep timer
  sleepTimerMinutes: number | null;
  sleepTimerEndTime: Date | null;

  // UI state
  isFullPlayerOpen: boolean;

  // Actions
  play: (episode: PodcastEpisode) => void;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  seek: (time: number) => void;
  setVolume: (volume: number) => void;
  setPlaybackRate: (rate: PlaybackRate) => void;
  setDuration: (duration: number) => void;
  setBuffering: (buffering: boolean) => void;
  setError: (error: string | null) => void;
  next: () => void;
  previous: () => void;
  addToQueue: (episode: PodcastEpisode) => void;
  removeFromQueue: (episodeId: string) => void;
  clearQueue: () => void;
  setSleepTimer: (minutes: number | null) => void;
  checkSleepTimer: () => boolean;
  openFullPlayer: () => void;
  closeFullPlayer: () => void;
}

export const useAudioStore = create<AudioState>()(
  persist(
    (set, get) => ({
      // Initial state
      currentEpisode: null,
      isPlaying: false,
      currentTime: 0,
      duration: 0,
      volume: 1,
      playbackRate: 1,
      isBuffering: false,
      error: null,
      queue: [],
      queueIndex: 0,
      sleepTimerMinutes: null,
      sleepTimerEndTime: null,
      isFullPlayerOpen: false,

      // Actions
      play: (episode) =>
        set({
          currentEpisode: episode,
          isPlaying: true,
          currentTime: episode.savedPosition ?? 0,
          error: null,
        }),

      pause: () => set({ isPlaying: false }),

      resume: () => set({ isPlaying: true }),

      stop: () =>
        set({
          currentEpisode: null,
          isPlaying: false,
          currentTime: 0,
          duration: 0,
        }),

      seek: (time) => set({ currentTime: Math.max(0, time) }),

      setVolume: (volume) => set({ volume: Math.max(0, Math.min(1, volume)) }),

      setPlaybackRate: (rate) => set({ playbackRate: rate }),

      setDuration: (duration) => set({ duration }),

      setBuffering: (buffering) => set({ isBuffering: buffering }),

      setError: (error) => set({ error, isPlaying: false }),

      next: () => {
        const { queue, queueIndex } = get();
        if (queueIndex < queue.length - 1) {
          const nextEpisode = queue[queueIndex + 1];
          set({
            queueIndex: queueIndex + 1,
            currentEpisode: nextEpisode,
            currentTime: nextEpisode.savedPosition ?? 0,
            isPlaying: true,
          });
        } else {
          // End of queue
          set({ isPlaying: false });
        }
      },

      previous: () => {
        const { queue, queueIndex, currentTime } = get();
        // If more than 3 seconds in, restart current; otherwise go back
        if (currentTime > 3) {
          set({ currentTime: 0 });
        } else if (queueIndex > 0) {
          const prevEpisode = queue[queueIndex - 1];
          set({
            queueIndex: queueIndex - 1,
            currentEpisode: prevEpisode,
            currentTime: prevEpisode.savedPosition ?? 0,
            isPlaying: true,
          });
        }
      },

      addToQueue: (episode) =>
        set((state) => ({
          queue: [...state.queue, episode],
        })),

      removeFromQueue: (episodeId) =>
        set((state) => ({
          queue: state.queue.filter((ep) => ep.id !== episodeId),
        })),

      clearQueue: () => set({ queue: [], queueIndex: 0 }),

      setSleepTimer: (minutes) =>
        set({
          sleepTimerMinutes: minutes,
          sleepTimerEndTime: minutes
            ? new Date(Date.now() + minutes * 60 * 1000)
            : null,
        }),

      checkSleepTimer: () => {
        const { sleepTimerEndTime, isPlaying } = get();
        if (sleepTimerEndTime && isPlaying && new Date() >= sleepTimerEndTime) {
          set({
            isPlaying: false,
            sleepTimerMinutes: null,
            sleepTimerEndTime: null,
          });
          return true; // Timer triggered
        }
        return false;
      },

      openFullPlayer: () => set({ isFullPlayerOpen: true }),
      closeFullPlayer: () => set({ isFullPlayerOpen: false }),
    }),
    {
      name: "rewind-audio-state",
      partialize: (state) => ({
        volume: state.volume,
        playbackRate: state.playbackRate,
        currentEpisode: state.currentEpisode,
        currentTime: state.currentTime,
        queue: state.queue,
        queueIndex: state.queueIndex,
      }),
    }
  )
);

// Selector for mini player visibility
export const useMiniPlayerVisible = () =>
  useAudioStore((state) => state.currentEpisode !== null);
