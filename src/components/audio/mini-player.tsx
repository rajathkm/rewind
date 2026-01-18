"use client";

import Image from "next/image";
import Link from "next/link";
import { Play, Pause, SkipBack, SkipForward, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAudioStore } from "@/stores/audio-store";
import { formatDuration } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";

interface MiniPlayerProps {
  className?: string;
}

export function MiniPlayer({ className }: MiniPlayerProps) {
  const {
    currentEpisode,
    isPlaying,
    currentTime,
    duration,
    pause,
    resume,
    seek,
  } = useAudioStore();

  if (!currentEpisode) return null;

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  const handlePlayPause = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isPlaying) {
      pause();
    } else {
      resume();
    }
  };

  const skipBackward = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    seek(Math.max(0, currentTime - 15));
  };

  const skipForward = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    seek(Math.min(duration, currentTime + 30));
  };

  return (
    <div className={cn("bg-background/95 backdrop-blur-lg border-t", className)}>
      {/* Progress Bar */}
      <div className="h-1 bg-muted">
        <div
          className="h-full bg-primary transition-all duration-200"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="flex items-center gap-3 px-4 py-2">
        {/* Cover Art */}
        <Link
          href={`/content/${currentEpisode.id}`}
          className="relative w-12 h-12 rounded-md overflow-hidden flex-shrink-0"
        >
          {currentEpisode.coverUrl ? (
            <Image
              src={currentEpisode.coverUrl}
              alt={currentEpisode.podcastName}
              fill
              className="object-cover"
              sizes="48px"
            />
          ) : (
            <div className="w-full h-full bg-muted flex items-center justify-center">
              <span className="text-xl">🎙️</span>
            </div>
          )}
        </Link>

        {/* Episode Info */}
        <Link
          href={`/content/${currentEpisode.id}`}
          className="flex-1 min-w-0"
        >
          <p className="text-sm font-medium truncate">
            {currentEpisode.episodeTitle}
          </p>
          <p className="text-xs text-muted-foreground truncate">
            {currentEpisode.podcastName}
          </p>
        </Link>

        {/* Time Display (hidden on very small screens) */}
        <div className="hidden sm:flex items-center gap-1 text-xs text-muted-foreground">
          <span>{formatDuration(currentTime)}</span>
          <span>/</span>
          <span>{formatDuration(duration)}</span>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 hidden sm:flex"
            onClick={skipBackward}
            aria-label="Skip back 15 seconds"
          >
            <SkipBack className="h-4 w-4" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10"
            onClick={handlePlayPause}
            aria-label={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying ? (
              <Pause className="h-5 w-5" />
            ) : (
              <Play className="h-5 w-5 ml-0.5" />
            )}
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 hidden sm:flex"
            onClick={skipForward}
            aria-label="Skip forward 30 seconds"
          >
            <SkipForward className="h-4 w-4" />
          </Button>
        </div>

        {/* Expand Button */}
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          asChild
        >
          <Link
            href={`/content/${currentEpisode.id}`}
            aria-label="Expand player"
          >
            <ChevronUp className="h-4 w-4" />
          </Link>
        </Button>
      </div>
    </div>
  );
}
