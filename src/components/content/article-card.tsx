"use client";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Clock,
  Bookmark,
  BookmarkCheck,
  Sparkles,
  Calendar,
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
  // Compact variant - horizontal layout for lists
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
          {imageUrl && (
            <div className="relative flex-shrink-0 w-20 h-20 rounded-xl overflow-hidden bg-muted">
              <img
                src={imageUrl}
                alt=""
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
            </div>
          )}

          {/* Content */}
          <div className="flex-1 min-w-0 flex flex-col justify-between">
            {/* Source & Badge */}
            <div className="flex items-center gap-2 mb-1.5">
              {sourceImageUrl && (
                <img
                  src={sourceImageUrl}
                  alt={sourceTitle}
                  className="w-4 h-4 rounded-full object-cover ring-1 ring-border"
                />
              )}
              <span className="text-xs font-medium text-muted-foreground truncate max-w-[120px]">
                {sourceTitle}
              </span>
              {hasSummary && (
                <Badge variant="success" size="sm" className="gap-1">
                  <Sparkles className="w-2.5 h-2.5" />
                  AI
                </Badge>
              )}
              {!hasSummary && processingStatus && processingStatus !== "completed" && (
                <ProcessingStatusBadge status={processingStatus} retryCount={retryCount} />
              )}
            </div>

            {/* Title */}
            <h3 className="font-semibold text-sm leading-snug line-clamp-2 group-hover:text-primary transition-colors">
              {title}
            </h3>

            {/* Meta */}
            <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
              {publishedAt && (
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {formatDate(publishedAt)}
                </span>
              )}
              {readingTimeMinutes && (
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {formatReadingTime(readingTimeMinutes)}
                </span>
              )}
            </div>
          </div>
        </div>
      </Card>
    );
  }

  // Featured variant - large hero card
  if (variant === "featured") {
    return (
      <Card
        variant="interactive"
        className={cn(
          "group overflow-hidden",
          isRead && "opacity-60"
        )}
        onClick={onClick}
      >
        {/* Large Hero Image */}
        <div className="relative aspect-[16/9] bg-muted overflow-hidden">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt=""
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-muted to-muted-foreground/10" />
          )}
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

          {/* Content overlay */}
          <div className="absolute inset-x-0 bottom-0 p-6">
            {/* Source & Badge */}
            <div className="flex items-center gap-3 mb-3">
              {sourceImageUrl && (
                <img
                  src={sourceImageUrl}
                  alt={sourceTitle}
                  className="w-6 h-6 rounded-full object-cover ring-2 ring-white/30"
                />
              )}
              <span className="text-sm font-medium text-white/90">
                {sourceTitle}
              </span>
              {hasSummary && (
                <Badge variant="glass" size="sm" className="gap-1">
                  <Sparkles className="w-3 h-3" />
                  AI Summary
                </Badge>
              )}
            </div>

            {/* Title */}
            <h2 className="text-2xl font-bold text-white leading-tight line-clamp-2 mb-2">
              {title}
            </h2>

            {/* Excerpt on featured */}
            {excerpt && (
              <p className="text-sm text-white/70 line-clamp-2 mb-3">
                {excerpt}
              </p>
            )}

            {/* Meta */}
            <div className="flex items-center gap-4 text-sm text-white/60">
              {publishedAt && (
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" />
                  {formatDate(publishedAt)}
                </span>
              )}
              {readingTimeMinutes && (
                <span className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  {formatReadingTime(readingTimeMinutes)}
                </span>
              )}
            </div>
          </div>
        </div>
      </Card>
    );
  }

  // Default variant - modern card with image on top
  return (
    <Card
      variant="interactive"
      className={cn(
        "group overflow-hidden h-full flex flex-col",
        isRead && "opacity-60"
      )}
      onClick={onClick}
    >
      {/* Image - Full width on top */}
      <div className="relative aspect-[16/10] bg-muted overflow-hidden">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt=""
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-surface-2 to-surface-3 flex items-center justify-center">
            <div className="w-12 h-12 rounded-2xl bg-muted-foreground/10 flex items-center justify-center">
              <span className="text-2xl font-bold text-muted-foreground/30">
                {sourceTitle?.charAt(0) || "A"}
              </span>
            </div>
          </div>
        )}

        {/* AI Summary badge overlay */}
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

        {/* Save button - visible on hover */}
        <div className="absolute top-3 left-3 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            variant="glass"
            size="icon-sm"
            className="rounded-full shadow-lg"
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

      {/* Content */}
      <div className="flex flex-col flex-1 p-5">
        {/* Source row */}
        <div className="flex items-center gap-2 mb-3">
          {sourceImageUrl ? (
            <img
              src={sourceImageUrl}
              alt={sourceTitle}
              className="w-5 h-5 rounded-full object-cover ring-1 ring-border"
            />
          ) : (
            <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-[10px] font-bold text-primary">
                {sourceTitle?.charAt(0) || "?"}
              </span>
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

        {/* Excerpt */}
        {excerpt && (
          <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2 mb-4 flex-1">
            {excerpt}
          </p>
        )}

        {/* Meta footer */}
        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-auto pt-3 border-t border-border/50">
          {publishedAt && (
            <span className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" />
              {formatDate(publishedAt)}
            </span>
          )}
          {readingTimeMinutes && (
            <span className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              {formatReadingTime(readingTimeMinutes)}
            </span>
          )}
        </div>
      </div>
    </Card>
  );
}
