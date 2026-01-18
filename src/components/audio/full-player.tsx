"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Volume1,
  Moon,
  ListMusic,
  ChevronDown,
  RotateCcw,
  RotateCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { useAudioStore } from "@/stores/audio-store";
import { formatDuration } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
import { PLAYBACK_RATES, type PlaybackRate } from "@/types/audio";

// Sleep timer options in minutes
const SLEEP_TIMER_OPTIONS = [
  { label: "Off", value: null },
  { label: "5 min", value: 5 },
  { label: "15 min", value: 15 },
  { label: "30 min", value: 30 },
  { label: "45 min", value: 45 },
  { label: "60 min", value: 60 },
  { label: "90 min", value: 90 },
];

interface FullPlayerProps {
  onClose?: () => void;
  className?: string;
}

export function FullPlayer({ onClose, className }: FullPlayerProps) {
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [showSleepMenu, setShowSleepMenu] = useState(false);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const progressRef = useRef<HTMLDivElement>(null);

  const {
    currentEpisode,
    isPlaying,
    currentTime,
    duration,
    volume,
    playbackRate,
    sleepTimerMinutes,
    sleepTimerEndTime,
    pause,
    resume,
    seek,
    setVolume,
    setPlaybackRate,
    setSleepTimer,
    next,
    previous,
    queue,
  } = useAudioStore();

  // Calculate sleep timer remaining time
  const [sleepTimeRemaining, setSleepTimeRemaining] = useState<number | null>(null);

  useEffect(() => {
    if (!sleepTimerEndTime) {
      setSleepTimeRemaining(null);
      return;
    }

    const updateRemaining = () => {
      const remaining = Math.max(0, sleepTimerEndTime.getTime() - Date.now());
      setSleepTimeRemaining(remaining > 0 ? remaining : null);
    };

    updateRemaining();
    const interval = setInterval(updateRemaining, 1000);
    return () => clearInterval(interval);
  }, [sleepTimerEndTime]);

  if (!currentEpisode) return null;

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  const handlePlayPause = () => {
    if (isPlaying) {
      pause();
    } else {
      resume();
    }
  };

  const skipBackward = () => {
    seek(Math.max(0, currentTime - 30));
  };

  const skipForward = () => {
    seek(Math.min(duration, currentTime + 30));
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressRef.current || duration === 0) return;

    const rect = progressRef.current.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    seek(percent * duration);
  };

  const handleSpeedChange = (speed: PlaybackRate) => {
    setPlaybackRate(speed);
    setShowSpeedMenu(false);
  };

  const handleSleepTimerChange = (minutes: number | null) => {
    setSleepTimer(minutes);
    setShowSleepMenu(false);
  };

  const handleVolumeChange = (value: number[]) => {
    setVolume(value[0] / 100);
  };

  const toggleMute = () => {
    setVolume(volume > 0 ? 0 : 1);
  };

  const formatSpeed = (speed: PlaybackRate) => {
    return speed === 1 ? "1x" : `${speed}x`;
  };

  const VolumeIcon = volume === 0 ? VolumeX : volume < 0.5 ? Volume1 : Volume2;

  return (
    <div className={cn("bg-background flex flex-col", className)}>
      {/* Header with close button */}
      {onClose && (
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="font-semibold">Now Playing</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <ChevronDown className="h-5 w-5" />
          </Button>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 gap-6">
        {/* Cover Art */}
        <div className="relative w-64 h-64 md:w-80 md:h-80 rounded-xl overflow-hidden shadow-2xl">
          {currentEpisode.coverUrl ? (
            <Image
              src={currentEpisode.coverUrl}
              alt={currentEpisode.podcastName}
              fill
              className="object-cover"
              sizes="320px"
              priority
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
              <span className="text-6xl">🎙️</span>
            </div>
          )}
        </div>

        {/* Episode Info */}
        <div className="text-center max-w-md">
          <h3 className="text-xl font-bold mb-1 line-clamp-2">
            {currentEpisode.episodeTitle}
          </h3>
          <Link
            href={`/subscriptions`}
            className="text-muted-foreground hover:text-primary transition-colors"
          >
            {currentEpisode.podcastName}
          </Link>
        </div>

        {/* Progress Bar */}
        <div className="w-full max-w-md">
          <div
            ref={progressRef}
            className="h-2 bg-muted rounded-full cursor-pointer relative group"
            onClick={handleProgressClick}
          >
            <div
              className="h-full bg-primary rounded-full transition-all relative"
              style={{ width: `${progress}%` }}
            >
              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 bg-primary rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg" />
            </div>
          </div>
          <div className="flex justify-between mt-2 text-sm text-muted-foreground">
            <span>{formatDuration(currentTime)}</span>
            <span>-{formatDuration(Math.max(0, duration - currentTime))}</span>
          </div>
        </div>

        {/* Main Controls */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            className="h-12 w-12"
            onClick={skipBackward}
            aria-label="Skip back 30 seconds"
          >
            <div className="relative">
              <RotateCcw className="h-6 w-6" />
              <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold">
                30
              </span>
            </div>
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10"
            onClick={() => previous()}
            disabled={queue.length === 0}
            aria-label="Previous"
          >
            <SkipBack className="h-5 w-5" />
          </Button>

          <Button
            size="icon"
            className="h-16 w-16 rounded-full"
            onClick={handlePlayPause}
            aria-label={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying ? (
              <Pause className="h-8 w-8" />
            ) : (
              <Play className="h-8 w-8 ml-1" />
            )}
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10"
            onClick={() => next()}
            disabled={queue.length === 0}
            aria-label="Next"
          >
            <SkipForward className="h-5 w-5" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="h-12 w-12"
            onClick={skipForward}
            aria-label="Skip forward 30 seconds"
          >
            <div className="relative">
              <RotateCw className="h-6 w-6" />
              <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold">
                30
              </span>
            </div>
          </Button>
        </div>

        {/* Secondary Controls */}
        <div className="flex items-center gap-6 w-full max-w-md justify-between">
          {/* Volume */}
          <div className="relative">
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10"
              onClick={() => setShowVolumeSlider(!showVolumeSlider)}
              onDoubleClick={toggleMute}
              aria-label="Volume"
            >
              <VolumeIcon className="h-5 w-5" />
            </Button>

            {showVolumeSlider && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowVolumeSlider(false)}
                />
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-popover border rounded-lg shadow-lg p-4 z-50 w-40">
                  <Slider
                    value={[volume * 100]}
                    max={100}
                    step={1}
                    onValueChange={handleVolumeChange}
                    className="w-full"
                  />
                  <div className="text-center text-xs text-muted-foreground mt-2">
                    {Math.round(volume * 100)}%
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Playback Speed */}
          <div className="relative">
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "h-10 px-3 font-medium",
                playbackRate !== 1 && "text-primary"
              )}
              onClick={() => setShowSpeedMenu(!showSpeedMenu)}
              aria-label="Playback speed"
            >
              {formatSpeed(playbackRate)}
            </Button>

            {showSpeedMenu && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowSpeedMenu(false)}
                />
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-popover border rounded-lg shadow-lg py-1 z-50 min-w-[100px]">
                  {PLAYBACK_RATES.map((speed) => (
                    <button
                      key={speed}
                      className={cn(
                        "w-full px-4 py-2 text-sm text-center hover:bg-muted transition-colors",
                        playbackRate === speed && "text-primary font-medium bg-muted"
                      )}
                      onClick={() => handleSpeedChange(speed)}
                    >
                      {formatSpeed(speed)}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Sleep Timer */}
          <div className="relative">
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "h-10 w-10",
                sleepTimerMinutes && "text-primary"
              )}
              onClick={() => setShowSleepMenu(!showSleepMenu)}
              aria-label="Sleep timer"
            >
              <Moon className="h-5 w-5" />
              {sleepTimeRemaining && (
                <span className="absolute -top-1 -right-1 text-[10px] bg-primary text-primary-foreground rounded-full px-1">
                  {Math.ceil(sleepTimeRemaining / 60000)}
                </span>
              )}
            </Button>

            {showSleepMenu && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowSleepMenu(false)}
                />
                <div className="absolute bottom-full right-0 mb-2 bg-popover border rounded-lg shadow-lg py-1 z-50 min-w-[120px]">
                  {SLEEP_TIMER_OPTIONS.map((option) => (
                    <button
                      key={option.label}
                      className={cn(
                        "w-full px-4 py-2 text-sm text-left hover:bg-muted transition-colors",
                        sleepTimerMinutes === option.value && "text-primary font-medium bg-muted"
                      )}
                      onClick={() => handleSleepTimerChange(option.value)}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Queue */}
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10"
            aria-label="Queue"
          >
            <ListMusic className="h-5 w-5" />
            {queue.length > 0 && (
              <span className="absolute -top-1 -right-1 text-[10px] bg-muted-foreground text-background rounded-full px-1.5">
                {queue.length}
              </span>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
