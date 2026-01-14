"use client";

import { useEffect, useRef, useCallback } from "react";
import { useAudioStore } from "@/stores/audio-store";

/**
 * AudioProvider - Manages the actual HTML5 audio element
 * This component should be mounted at the app level and handles:
 * - Audio playback
 * - Time updates
 * - Buffering states
 * - Sleep timer
 */
export function AudioProvider() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const animationRef = useRef<number | null>(null);

  const {
    currentEpisode,
    isPlaying,
    currentTime,
    volume,
    playbackRate,
    seek,
    setDuration,
    setBuffering,
    setError,
    checkSleepTimer,
    pause,
  } = useAudioStore();

  // Create audio element on mount
  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
      audioRef.current.preload = "metadata";
    }

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = "";
      }
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  // Update audio source when episode changes
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (currentEpisode?.audioUrl) {
      // Only change source if it's different
      if (audio.src !== currentEpisode.audioUrl) {
        audio.src = currentEpisode.audioUrl;
        audio.load();
      }
    } else {
      audio.src = "";
    }
  }, [currentEpisode?.audioUrl]);

  // Handle play/pause
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !currentEpisode) return;

    if (isPlaying) {
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch((error) => {
          console.error("Audio playback error:", error);
          setError("Failed to play audio");
        });
      }
    } else {
      audio.pause();
    }
  }, [isPlaying, currentEpisode, setError]);

  // Sync seek position from store to audio
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !currentEpisode) return;

    // Only seek if the difference is significant (> 1 second)
    if (Math.abs(audio.currentTime - currentTime) > 1) {
      audio.currentTime = currentTime;
    }
  }, [currentTime, currentEpisode]);

  // Update volume
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  // Update playback rate
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackRate;
    }
  }, [playbackRate]);

  // Time update animation loop
  const updateTime = useCallback(() => {
    const audio = audioRef.current;
    if (audio && isPlaying) {
      seek(audio.currentTime);

      // Check sleep timer
      if (checkSleepTimer()) {
        audio.pause();
        return;
      }
    }
    animationRef.current = requestAnimationFrame(updateTime);
  }, [isPlaying, seek, checkSleepTimer]);

  useEffect(() => {
    if (isPlaying) {
      animationRef.current = requestAnimationFrame(updateTime);
    } else if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPlaying, updateTime]);

  // Setup audio event listeners
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
    };

    const handleWaiting = () => {
      setBuffering(true);
    };

    const handleCanPlay = () => {
      setBuffering(false);
    };

    const handleError = () => {
      const errorMessage = audio.error?.message || "Audio playback error";
      console.error("Audio error:", errorMessage);
      setError(errorMessage);
    };

    const handleEnded = () => {
      pause();
      // Could trigger next() from store here for continuous playback
    };

    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("waiting", handleWaiting);
    audio.addEventListener("canplay", handleCanPlay);
    audio.addEventListener("error", handleError);
    audio.addEventListener("ended", handleEnded);

    return () => {
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("waiting", handleWaiting);
      audio.removeEventListener("canplay", handleCanPlay);
      audio.removeEventListener("error", handleError);
      audio.removeEventListener("ended", handleEnded);
    };
  }, [setDuration, setBuffering, setError, pause]);

  // This component doesn't render anything visible
  return null;
}
