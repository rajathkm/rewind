"use client";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Play,
  Pause,
  Clock,
  Bookmark,
  BookmarkCheck,
  Download,
  CheckCircle,
  Sparkles,
  Headphones,
  Calendar,
} from "lucide-react";
import { cn, formatDate, formatDuration } from "@/lib/utils";
import { useAudioStore } from "@/stores/audio-store";
import { ProcessingStatusBadge, ProcessingStatus } from "./processing-status-badge";

interface PodcastCardProps {
  id: string;
  title: string;
  description?: string;
  sourceTitle: string;
  sourceImageUrl?: string;
  imageUrl?: string;
  publishedAt?: Date | string;
  durationSeconds?: number;
  mediaUrl?: string;
  isRead?: boolean;
  isSaved?: boolean;
  hasSummary?: boolean;
  processingStatus?: ProcessingStatus;
  retryCount?: number;
  isDownloaded?: boolean;
  playbackProgress?: number;
  variant?: "default" | "compact";
  onClick?: () => void;
  onSave?: () => void;
  onDownload?: () => void;
}

export function PodcastCard({
  id,
  title,
  description,
  sourceTitle,
  sourceImageUrl,
  imageUrl,
  publishedAt,
  durationSeconds,
  mediaUrl,
  isRead = false,
  isSaved = false,
  hasSummary = false,
  processingStatus,
  retryCount,
  isDownloaded = false,
  playbackProgress = 0,
  variant = "default",
  onClick,
  onSave,
  onDownload,
}: PodcastCardProps) {
  const { currentEpisode, isPlaying, play, pause } = useAudioStore();
  const isCurrentEpisode = currentEpisode?.id === id;
  const isCurrentlyPlaying = isCurrentEpisode && isPlaying;

  const handlePlayPause = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!mediaUrl) return;

    if (isCurrentlyPlaying) {
      pause();
    } else {
      play({
        id,
        podcastId: id,
        podcastName: sourceTitle,
        episodeTitle: title,
        audioUrl: mediaUrl,
        coverUrl: imageUrl || sourceImageUrl || "",
        duration: durationSeconds || 0,
      });
    }
  };

  const coverImage = imageUrl || sourceImageUrl;

  // Compact variant
  if (variant === "compact") {
    return (
      <Card
        variant="interactive"
        className={cn(
          "group overflow-hidden",
          isRead && "opacity-60"
        )}
        onClick={onClick}
      >
        <div className="flex gap-4 p-4">
          {/* Cover with play button */}
          <div className="relative flex-shrink-0">
            <div className="w-16 h-16 rounded-xl overflow-hidden bg-muted">
              {coverImage ? (
                <img
                  src={coverImage}
                  alt=""
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                  <Headphones className="w-6 h-6 text-primary/50" />
                </div>
              )}
            </div>
            {/* Play button */}
            <Button
              variant="default"
              size="icon-sm"
              className="absolute -bottom-1.5 -right-1.5 rounded-full shadow-lg h-7 w-7"
              onClick={handlePlayPause}
            >
              {isCurrentlyPlaying ? (
                <Pause className="w-3 h-3" />
              ) : (
                <Play className="w-3 h-3 ml-0.5" />
              )}
            </Button>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0 flex flex-col justify-between">
            <div>
              {/* Source */}
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-medium text-muted-foreground truncate max-w-[140px]">
                  {sourceTitle}
                </span>
                {hasSummary && (
                  <Badge variant="success" size="sm" className="gap-0.5">
                    <Sparkles className="w-2.5 h-2.5" />
                    AI
                  </Badge>
                )}
              </div>

              {/* Title */}
              <h3 className="font-semibold text-sm leading-snug line-clamp-1 group-hover:text-primary transition-colors">
                {title}
              </h3>
            </div>

            {/* Meta */}
            <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
              {durationSeconds && (
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {formatDuration(durationSeconds)}
                </span>
              )}
              {playbackProgress > 0 && playbackProgress < 100 && (
                <span className="text-primary font-medium">
                  {Math.round(playbackProgress)}%
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Progress bar */}
        {playbackProgress > 0 && playbackProgress < 100 && (
          <Progress value={playbackProgress} className="h-1 rounded-none" />
        )}
      </Card>
    );
  }

  // Default variant - modern card design
  return (
    <Card
      variant="interactive"
      className={cn(
        "group overflow-hidden h-full flex flex-col",
        isRead && "opacity-60"
      )}
      onClick={onClick}
    >
      {/* Cover Image */}
      <div className="relative aspect-square bg-muted overflow-hidden">
        {coverImage ? (
          <img
            src={coverImage}
            alt=""
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-primary/20 to-accent/10 flex items-center justify-center">
            <Headphones className="w-16 h-16 text-primary/30" />
          </div>
        )}

        {/* Play button overlay - centered */}
        <div className="absolute inset-0 flex items-center justify-center">
          <Button
            variant="default"
            size="icon-lg"
            className={cn(
              "rounded-full shadow-2xl transition-all duration-300",
              "bg-white/95 hover:bg-white text-foreground hover:scale-110",
              "opacity-0 group-hover:opacity-100"
            )}
            onClick={handlePlayPause}
          >
            {isCurrentlyPlaying ? (
              <Pause className="w-6 h-6" />
            ) : (
              <Play className="w-6 h-6 ml-1" />
            )}
          </Button>
        </div>

        {/* Duration badge */}
        {durationSeconds && (
          <div className="absolute bottom-3 left-3">
            <Badge variant="secondary" className="bg-black/70 text-white border-0 shadow-lg">
              <Clock className="w-3 h-3 mr-1" />
              {formatDuration(durationSeconds)}
            </Badge>
          </div>
        )}

        {/* AI Summary badge */}
        {hasSummary && (
          <div className="absolute top-3 right-3">
            <Badge variant="glass" size="sm" className="gap-1 shadow-lg">
              <Sparkles className="w-3 h-3" />
              AI Summary
            </Badge>
          </div>
        )}

        {/* Processing status */}
        {!hasSummary && processingStatus && processingStatus !== "completed" && (
          <div className="absolute top-3 right-3">
            <ProcessingStatusBadge status={processingStatus} retryCount={retryCount} showLabel />
          </div>
        )}

        {/* Downloaded indicator */}
        {isDownloaded && (
          <div className="absolute top-3 left-3">
            <div className="w-6 h-6 rounded-full bg-success flex items-center justify-center shadow-lg">
              <CheckCircle className="w-4 h-4 text-white" />
            </div>
          </div>
        )}

        {/* Progress bar overlay */}
        {playbackProgress > 0 && playbackProgress < 100 && (
          <div className="absolute bottom-0 left-0 right-0">
            <Progress value={playbackProgress} className="h-1 rounded-none bg-black/30" />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex flex-col flex-1 p-5">
        {/* Source */}
        <div className="flex items-center gap-2 mb-3">
          {sourceImageUrl && sourceImageUrl !== imageUrl ? (
            <img
              src={sourceImageUrl}
              alt={sourceTitle}
              className="w-5 h-5 rounded-full object-cover ring-1 ring-border"
            />
          ) : (
            <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center">
              <Headphones className="w-3 h-3 text-primary" />
            </div>
          )}
          <span className="text-sm font-medium text-muted-foreground truncate">
            {sourceTitle}
          </span>
        </div>

        {/* Title */}
        <h3 className="font-semibold text-base leading-snug line-clamp-2 group-hover:text-primary transition-colors mb-2">
          {title}
        </h3>

        {/* Description */}
        {description && (
          <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2 mb-4 flex-1">
            {description}
          </p>
        )}

        {/* Meta footer */}
        <div className="flex items-center justify-between mt-auto pt-3 border-t border-border/50">
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            {publishedAt && (
              <span className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" />
                {formatDate(publishedAt)}
              </span>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={(e) => {
                e.stopPropagation();
                onDownload?.();
              }}
            >
              <Download className={cn("w-4 h-4", isDownloaded && "text-success")} />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={(e) => {
                e.stopPropagation();
                onSave?.();
              }}
            >
              {isSaved ? (
                <BookmarkCheck className="w-4 h-4 text-primary" />
              ) : (
                <Bookmark className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}
