"use client";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Youtube,
  Bookmark,
  BookmarkCheck,
  ExternalLink,
  Sparkles,
  Play,
  Clock,
  Calendar,
} from "lucide-react";
import { cn, formatDate, formatDuration } from "@/lib/utils";
import { ProcessingStatusBadge, ProcessingStatus } from "./processing-status-badge";

interface YouTubeCardProps {
  id: string;
  title: string;
  channelName?: string;
  thumbnailUrl?: string;
  publishedAt?: Date | string;
  durationSeconds?: number;
  videoId?: string;
  isRead?: boolean;
  isSaved?: boolean;
  hasSummary?: boolean;
  processingStatus?: ProcessingStatus;
  retryCount?: number;
  variant?: "default" | "compact";
  onClick?: () => void;
  onSave?: () => void;
}

export function YouTubeCard({
  id,
  title,
  channelName,
  thumbnailUrl,
  publishedAt,
  durationSeconds,
  videoId,
  isRead = false,
  isSaved = false,
  hasSummary = false,
  processingStatus,
  retryCount,
  variant = "default",
  onClick,
  onSave,
}: YouTubeCardProps) {
  const youtubeUrl = videoId
    ? `https://www.youtube.com/watch?v=${videoId}`
    : undefined;

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
          {/* Thumbnail */}
          <div className="relative flex-shrink-0 w-28 aspect-video rounded-xl overflow-hidden bg-muted">
            {thumbnailUrl ? (
              <img
                src={thumbnailUrl}
                alt=""
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-red-500/20 to-red-500/5 flex items-center justify-center">
                <Youtube className="w-8 h-8 text-red-500/50" />
              </div>
            )}
            {/* Play overlay */}
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20">
              <div className="w-8 h-8 rounded-full bg-white/95 flex items-center justify-center shadow-lg">
                <Play className="w-4 h-4 text-foreground ml-0.5" />
              </div>
            </div>
            {/* Duration */}
            {durationSeconds && (
              <div className="absolute bottom-1 right-1 bg-black/80 text-white text-[10px] px-1.5 py-0.5 rounded font-medium">
                {formatDuration(durationSeconds)}
              </div>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0 flex flex-col justify-between">
            {/* Channel */}
            <div className="flex items-center gap-2 mb-1">
              <Youtube className="w-3.5 h-3.5 text-red-500" />
              <span className="text-xs font-medium text-muted-foreground truncate max-w-[120px]">
                {channelName || "YouTube"}
              </span>
              {hasSummary && (
                <Badge variant="success" size="sm" className="gap-0.5">
                  <Sparkles className="w-2.5 h-2.5" />
                  AI
                </Badge>
              )}
            </div>

            {/* Title */}
            <h3 className="font-semibold text-sm leading-snug line-clamp-2 group-hover:text-primary transition-colors">
              {title}
            </h3>

            {/* Meta */}
            {publishedAt && (
              <p className="text-xs text-muted-foreground mt-1.5 flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {formatDate(publishedAt)}
              </p>
            )}
          </div>
        </div>
      </Card>
    );
  }

  // Default variant - modern card with video thumbnail
  return (
    <Card
      variant="interactive"
      className={cn(
        "group overflow-hidden h-full flex flex-col",
        isRead && "opacity-60"
      )}
      onClick={onClick}
    >
      {/* Video Thumbnail */}
      <div className="relative aspect-video bg-muted overflow-hidden">
        {thumbnailUrl ? (
          <img
            src={thumbnailUrl}
            alt=""
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-red-500/20 to-red-500/5 flex items-center justify-center">
            <Youtube className="w-16 h-16 text-red-500/50" />
          </div>
        )}

        {/* Play button overlay */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className={cn(
            "w-16 h-16 rounded-full bg-white/95 flex items-center justify-center shadow-2xl",
            "transition-all duration-300 group-hover:scale-110",
            "opacity-80 group-hover:opacity-100"
          )}>
            <Play className="w-7 h-7 text-foreground ml-1" />
          </div>
        </div>

        {/* Duration badge */}
        {durationSeconds && (
          <div className="absolute bottom-3 right-3">
            <Badge variant="secondary" className="bg-black/80 text-white border-0 shadow-lg font-mono">
              <Clock className="w-3 h-3 mr-1" />
              {formatDuration(durationSeconds)}
            </Badge>
          </div>
        )}

        {/* YouTube badge */}
        <div className="absolute top-3 left-3">
          <Badge className="bg-red-600 hover:bg-red-600 text-white border-0 shadow-lg">
            <Youtube className="w-3 h-3 mr-1" />
            YouTube
          </Badge>
        </div>

        {/* AI Summary badge */}
        {hasSummary && (
          <div className="absolute top-3 right-3">
            <Badge variant="aiSummary" size="sm" className="gap-1">
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
      </div>

      {/* Content */}
      <div className="flex flex-col flex-1 p-5">
        {/* Channel */}
        <div className="flex items-center gap-2 mb-3">
          <div className="w-5 h-5 rounded-full bg-red-500/10 flex items-center justify-center">
            <Youtube className="w-3 h-3 text-red-500" />
          </div>
          <span className="text-sm font-medium text-muted-foreground truncate">
            {channelName || "Unknown Channel"}
          </span>
        </div>

        {/* Title */}
        <h3 className="font-semibold text-base leading-snug line-clamp-2 group-hover:text-primary transition-colors mb-2 flex-1">
          {title}
        </h3>

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
            {youtubeUrl && (
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={(e) => {
                  e.stopPropagation();
                  window.open(youtubeUrl, "_blank", "noopener,noreferrer");
                }}
              >
                <ExternalLink className="w-4 h-4" />
              </Button>
            )}
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
