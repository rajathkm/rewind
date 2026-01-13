"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Youtube,
  Bookmark,
  BookmarkCheck,
  ExternalLink,
  Sparkles,
  Play,
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
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
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
              <div className="w-16 h-10 rounded-md overflow-hidden bg-muted">
                {thumbnailUrl ? (
                  <img
                    src={thumbnailUrl}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Youtube className="w-6 h-6 text-red-500" />
                  </div>
                )}
              </div>
              {/* Play overlay */}
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="w-6 h-6 rounded-full bg-black/70 flex items-center justify-center">
                  <Play className="w-3 h-3 text-white ml-0.5" />
                </div>
              </div>
              {/* Duration badge */}
              {durationSeconds && (
                <div className="absolute bottom-0.5 right-0.5 bg-black/80 text-white text-[10px] px-1 rounded">
                  {formatDuration(durationSeconds)}
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-xs text-muted-foreground truncate flex items-center gap-1">
                  <Youtube className="w-3 h-3 text-red-500" />
                  {channelName || "YouTube"}
                </span>
                {hasSummary && <Sparkles className="w-3 h-3 text-primary" />}
                {!hasSummary && processingStatus && processingStatus !== "completed" && (
                  <ProcessingStatusBadge status={processingStatus} retryCount={retryCount} />
                )}
              </div>
              <h3 className="font-medium text-sm line-clamp-1">{title}</h3>
              {publishedAt && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  {formatDate(publishedAt)}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Default variant
  return (
    <Card
      className={cn(
        "group cursor-pointer transition-all hover:shadow-md overflow-hidden",
        isRead && "opacity-60"
      )}
      onClick={onClick}
    >
      {/* Thumbnail */}
      <div className="relative aspect-video bg-muted">
        {thumbnailUrl ? (
          <img
            src={thumbnailUrl}
            alt=""
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Youtube className="w-12 h-12 text-red-500" />
          </div>
        )}
        {/* Play button overlay */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20">
          <div className="w-14 h-14 rounded-full bg-black/70 flex items-center justify-center">
            <Play className="w-7 h-7 text-white ml-1" />
          </div>
        </div>
        {/* Duration badge */}
        {durationSeconds && (
          <div className="absolute bottom-2 right-2 bg-black/80 text-white text-xs px-1.5 py-0.5 rounded">
            {formatDuration(durationSeconds)}
          </div>
        )}
        {/* YouTube badge */}
        <div className="absolute top-2 left-2">
          <Badge variant="secondary" className="bg-red-500 text-white text-xs">
            <Youtube className="w-3 h-3 mr-1" />
            YouTube
          </Badge>
        </div>
      </div>

      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-sm text-muted-foreground truncate">
            {channelName || "Unknown Channel"}
          </span>
          {hasSummary && (
            <Badge variant="outline" className="text-xs">
              <Sparkles className="w-3 h-3 mr-1" />
              Summary
            </Badge>
          )}
          {!hasSummary && processingStatus && processingStatus !== "completed" && (
            <ProcessingStatusBadge status={processingStatus} retryCount={retryCount} showLabel />
          )}
        </div>

        <h3 className="font-semibold text-base line-clamp-2 group-hover:text-primary transition-colors mb-2">
          {title}
        </h3>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            {publishedAt && <span>{formatDate(publishedAt)}</span>}
          </div>

          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {youtubeUrl && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
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
      </CardContent>
    </Card>
  );
}
