"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  BookOpen,
  Clock,
  Bookmark,
  BookmarkCheck,
  Check,
  Sparkles,
} from "lucide-react";
import { cn, formatDate, formatReadingTime } from "@/lib/utils";
import { ProcessingStatusBadge, ProcessingStatus } from "./processing-status-badge";

interface ArticleCardProps {
  id: string;
  title: string;
  excerpt?: string;
  sourceTitle: string;
  sourceImageUrl?: string;
  imageUrl?: string;
  publishedAt?: Date | string;
  readingTimeMinutes?: number;
  isRead?: boolean;
  isSaved?: boolean;
  hasSummary?: boolean;
  processingStatus?: ProcessingStatus;
  retryCount?: number;
  variant?: "default" | "compact" | "featured";
  onClick?: () => void;
  onSave?: () => void;
  onMarkRead?: () => void;
}

export function ArticleCard({
  id,
  title,
  excerpt,
  sourceTitle,
  sourceImageUrl,
  imageUrl,
  publishedAt,
  readingTimeMinutes,
  isRead = false,
  isSaved = false,
  hasSummary = false,
  processingStatus,
  retryCount,
  variant = "default",
  onClick,
  onSave,
  onMarkRead,
}: ArticleCardProps) {
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
          <div className="flex items-start gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                {sourceImageUrl && (
                  <img
                    src={sourceImageUrl}
                    alt={sourceTitle}
                    className="w-4 h-4 rounded-sm object-cover"
                  />
                )}
                <span className="text-xs text-muted-foreground truncate">
                  {sourceTitle}
                </span>
                {hasSummary && (
                  <Sparkles className="w-3 h-3 text-primary" />
                )}
                {!hasSummary && processingStatus && processingStatus !== "completed" && (
                  <ProcessingStatusBadge status={processingStatus} retryCount={retryCount} />
                )}
              </div>
              <h3 className="font-medium text-sm line-clamp-2 group-hover:text-primary transition-colors">
                {title}
              </h3>
              <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                {publishedAt && <span>{formatDate(publishedAt)}</span>}
                {readingTimeMinutes && (
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatReadingTime(readingTimeMinutes)}
                  </span>
                )}
              </div>
            </div>
            {imageUrl && (
              <img
                src={imageUrl}
                alt=""
                className="w-16 h-16 rounded object-cover flex-shrink-0"
              />
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (variant === "featured") {
    return (
      <Card
        className={cn(
          "group cursor-pointer transition-all hover:shadow-lg overflow-hidden",
          isRead && "opacity-60"
        )}
        onClick={onClick}
      >
        {imageUrl && (
          <div className="relative aspect-video">
            <img
              src={imageUrl}
              alt=""
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-4">
              <div className="flex items-center gap-2 mb-2">
                {sourceImageUrl && (
                  <img
                    src={sourceImageUrl}
                    alt={sourceTitle}
                    className="w-5 h-5 rounded-full object-cover border border-white/20"
                  />
                )}
                <span className="text-sm text-white/90">{sourceTitle}</span>
                {hasSummary && (
                  <Badge variant="secondary" className="text-xs">
                    <Sparkles className="w-3 h-3 mr-1" />
                    Summary
                  </Badge>
                )}
                {!hasSummary && processingStatus && processingStatus !== "completed" && (
                  <ProcessingStatusBadge status={processingStatus} retryCount={retryCount} showLabel />
                )}
              </div>
              <h2 className="text-xl font-bold text-white line-clamp-2">
                {title}
              </h2>
            </div>
          </div>
        )}
        <CardContent className="p-4">
          {excerpt && (
            <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
              {excerpt}
            </p>
          )}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              {publishedAt && <span>{formatDate(publishedAt)}</span>}
              {readingTimeMinutes && (
                <span className="flex items-center gap-1">
                  <BookOpen className="w-4 h-4" />
                  {formatReadingTime(readingTimeMinutes)}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
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
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onMarkRead?.();
                }}
              >
                <Check className={cn("w-4 h-4", isRead && "text-green-500")} />
              </Button>
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
        "group cursor-pointer transition-all hover:shadow-md",
        isRead && "opacity-60"
      )}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              {sourceImageUrl && (
                <img
                  src={sourceImageUrl}
                  alt={sourceTitle}
                  className="w-5 h-5 rounded object-cover"
                />
              )}
              <span className="text-sm text-muted-foreground truncate">
                {sourceTitle}
              </span>
              {hasSummary && (
                <Badge variant="outline" className="text-xs">
                  <Sparkles className="w-3 h-3 mr-1" />
                  AI Summary
                </Badge>
              )}
              {!hasSummary && processingStatus && processingStatus !== "completed" && (
                <ProcessingStatusBadge status={processingStatus} retryCount={retryCount} showLabel />
              )}
            </div>
            <h3 className="font-semibold text-base line-clamp-2 group-hover:text-primary transition-colors mb-2">
              {title}
            </h3>
            {excerpt && (
              <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                {excerpt}
              </p>
            )}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                {publishedAt && <span>{formatDate(publishedAt)}</span>}
                {readingTimeMinutes && (
                  <span className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {formatReadingTime(readingTimeMinutes)}
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
          {imageUrl && (
            <img
              src={imageUrl}
              alt=""
              className="w-24 h-24 rounded-lg object-cover flex-shrink-0"
            />
          )}
        </div>
      </CardContent>
    </Card>
  );
}
