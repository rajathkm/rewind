"use client";

import { Card, CardContent } from "@/components/ui/card";
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
} from "lucide-react";
import { cn, formatDate, formatDuration } from "@/lib/utils";
import { useAudioStore } from "@/stores/audio-store";

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
        podcastId: id, // Using episode id as podcast id for simplicity
        podcastName: sourceTitle,
        episodeTitle: title,
        audioUrl: mediaUrl,
        coverUrl: imageUrl || sourceImageUrl || "",
        duration: durationSeconds || 0,
      });
    }
  };

  if (variant === "compact") {
    return (
      <Card
        className={cn(
          "group cursor-pointer transition-all hover:shadow-md",
          isRead && "opacity-60"
        )}
        onClick={onClick}
      >
        <CardContent className="p-3">
          <div className="flex items-center gap-3">
            <div className="relative flex-shrink-0">
              <div className="w-12 h-12 rounded-lg overflow-hidden bg-muted">
                {(imageUrl || sourceImageUrl) && (
                  <img
                    src={imageUrl || sourceImageUrl}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                )}
              </div>
              <Button
                variant="secondary"
                size="icon"
                className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full shadow-md"
                onClick={handlePlayPause}
              >
                {isCurrentlyPlaying ? (
                  <Pause className="w-3 h-3" />
                ) : (
                  <Play className="w-3 h-3 ml-0.5" />
                )}
              </Button>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-xs text-muted-foreground truncate">
                  {sourceTitle}
                </span>
                {hasSummary && <Sparkles className="w-3 h-3 text-primary" />}
              </div>
              <h3 className="font-medium text-sm line-clamp-1">{title}</h3>
              <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                {durationSeconds && (
                  <span className="flex items-center gap-1">
                    <Headphones className="w-3 h-3" />
                    {formatDuration(durationSeconds)}
                  </span>
                )}
                {playbackProgress > 0 && playbackProgress < 100 && (
                  <span>{Math.round(playbackProgress)}% played</span>
                )}
              </div>
            </div>
          </div>
          {playbackProgress > 0 && playbackProgress < 100 && (
            <Progress value={playbackProgress} className="h-1 mt-2" />
          )}
        </CardContent>
      </Card>
    );
  }

  // Default variant
  return (
    <Card
      className={cn(
        "group cursor-pointer transition-all hover:shadow-md",
        isRead && "opacity-60"
      )}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex gap-4">
          <div className="relative flex-shrink-0">
            <div className="w-20 h-20 rounded-lg overflow-hidden bg-muted">
              {(imageUrl || sourceImageUrl) && (
                <img
                  src={imageUrl || sourceImageUrl}
                  alt=""
                  className="w-full h-full object-cover"
                />
              )}
            </div>
            <Button
              variant="secondary"
              size="icon"
              className="absolute -bottom-2 -right-2 h-8 w-8 rounded-full shadow-lg"
              onClick={handlePlayPause}
            >
              {isCurrentlyPlaying ? (
                <Pause className="w-4 h-4" />
              ) : (
                <Play className="w-4 h-4 ml-0.5" />
              )}
            </Button>
            {isDownloaded && (
              <CheckCircle className="absolute top-1 right-1 w-4 h-4 text-green-500 bg-white rounded-full" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm text-muted-foreground truncate">
                {sourceTitle}
              </span>
              {hasSummary && (
                <Badge variant="outline" className="text-xs">
                  <Sparkles className="w-3 h-3 mr-1" />
                  Summary
                </Badge>
              )}
            </div>
            <h3 className="font-semibold text-base line-clamp-2 group-hover:text-primary transition-colors mb-1">
              {title}
            </h3>
            {description && (
              <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                {description}
              </p>
            )}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                {publishedAt && <span>{formatDate(publishedAt)}</span>}
                {durationSeconds && (
                  <span className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {formatDuration(durationSeconds)}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDownload?.();
                  }}
                >
                  <Download
                    className={cn("w-4 h-4", isDownloaded && "text-green-500")}
                  />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
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
            {playbackProgress > 0 && playbackProgress < 100 && (
              <Progress value={playbackProgress} className="h-1 mt-3" />
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
