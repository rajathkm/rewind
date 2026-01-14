"use client";

import { useEffect, useRef, useCallback, useState } from "react";
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
  const [isMounted, setIsMounted] = useState(false);

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

  // Mark as mounted (client-side only)
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Create audio element on mount
  useEffect(() => {
    if (!isMounted) return;

    if (!audioRef.current) {
      audioRef.current = new Audio();
      audioRef.current.preload = "metadata";
    }

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        // Don't set empty src to avoid error
        audioRef.current.removeAttribute("src");
      }
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isMounted]);

  // Update audio source when episode changes
  useEffect(() => {
    if (!isMounted) return;
    const audio = audioRef.current;
    if (!audio) return;

    if (currentEpisode?.audioUrl) {
      // Only change source if it's different
      if (audio.src !== currentEpisode.audioUrl) {
        audio.src = currentEpisode.audioUrl;
        audio.load();
      }
    } else {
      // Don't set empty src - just remove attribute to avoid error
      audio.removeAttribute("src");
      audio.load(); // Reset the audio element
    }
  }, [currentEpisode?.audioUrl, isMounted]);

  // Handle play/pause
  useEffect(() => {
    if (!isMounted) return;
    const audio = audioRef.current;
    if (!audio || !currentEpisode?.audioUrl) return;

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
  }, [isPlaying, currentEpisode?.audioUrl, setError, isMounted]);

  // Sync seek position from store to audio
  useEffect(() => {
    if (!isMounted) return;
    const audio = audioRef.current;
    if (!audio || !currentEpisode?.audioUrl) return;

    // Only seek if the difference is significant (> 1 second)
    if (Math.abs(audio.currentTime - currentTime) > 1) {
      audio.currentTime = currentTime;
    }
  }, [currentTime, currentEpisode?.audioUrl, isMounted]);

  // Update volume
  useEffect(() => {
    if (!isMounted || !audioRef.current) return;
    audioRef.current.volume = volume;
  }, [volume, isMounted]);

  // Update playback rate
  useEffect(() => {
    if (!isMounted || !audioRef.current) return;
    audioRef.current.playbackRate = playbackRate;
  }, [playbackRate, isMounted]);

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
    if (!isMounted) return;
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
      // Only log error if there's actually a source set
      if (audio.src && audio.src !== window.location.href) {
        const errorMessage = audio.error?.message || "Audio playback error";
        console.error("Audio error:", errorMessage);
        setError(errorMessage);
      }
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
  }, [setDuration, setBuffering, setError, pause, isMounted]);

  // This component doesn't render anything visible
  return null;
}
