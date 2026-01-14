"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SummaryDisplay } from "@/components/content/summary-display";
import { ProcessingStatusBadge, ProcessingStatus } from "@/components/content/processing-status-badge";
import {
  ArrowLeft,
  BookOpen,
  Sparkles,
  Clock,
  ExternalLink,
  Play,
  X,
  RefreshCw,
} from "lucide-react";
import { cn, formatDate, formatReadingTime } from "@/lib/utils";
import type { SummaryOutput } from "@/lib/summarization/schema";

interface ContentItem {
  id: string;
  title: string;
  excerpt?: string;
  contentType: string;
  publishedAt?: string;
  imageUrl?: string;
  url?: string;
  mediaUrl?: string;
  durationSeconds?: number;
  readingTimeMinutes?: number;
  processingStatus?: ProcessingStatus;
  retryCount?: number;
  sourceId?: string;
  sourceTitle?: string;
  sourceType?: string;
  sourceImageUrl?: string;
  isRead?: boolean;
  isSaved?: boolean;
  hasSummary?: boolean;
  playbackProgress?: number;
  // YouTube-specific fields (from detailed fetch)
  youtubeVideoId?: string;
  youtubeChannelName?: string;
  youtubeThumbnailUrl?: string;
}

interface FullSummary {
  id: string;
  content_item_id: string;
  summary_type: string;
  headline: string;
  tldr: string;
  full_summary: string;
  key_points: string[];
  key_takeaways?: unknown[];
  related_ideas?: unknown[];
  allied_trivia?: unknown[];
  speakers?: unknown[];
  chapters?: unknown[];
}

export default function ContentPage() {
  const [contentItems, setContentItems] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedSummary, setSelectedSummary] = useState<SummaryOutput | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);

  // Fetch content items on mount
  useEffect(() => {
    async function fetchContent() {
      try {
        const response = await fetch("/api/content");
        if (response.ok) {
          const data = await response.json();
          setContentItems(data.items || []);
        }
      } catch (error) {
        console.error("Failed to fetch content:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchContent();
  }, []);

  // Fetch full summary when an item is selected
  useEffect(() => {
    if (!selectedId) {
      setSelectedSummary(null);
      return;
    }

    async function fetchSummary() {
      setSummaryLoading(true);
      try {
        const response = await fetch(`/api/content/${selectedId}/summary`);
        if (response.ok) {
          const data = await response.json();
          if (data.summary) {
            // Transform database format to SummaryOutput format
            const dbSummary = data.summary as FullSummary;
            const transformed: SummaryOutput = {
              headline: dbSummary.headline || "",
              tldr: dbSummary.tldr || "",
              fullSummary: dbSummary.full_summary || "",
              keyPoints: dbSummary.key_points || [],
              keyTakeaways: (dbSummary.key_takeaways as SummaryOutput["keyTakeaways"]) || [],
              relatedIdeas: (dbSummary.related_ideas as SummaryOutput["relatedIdeas"]) || [],
              alliedTrivia: (dbSummary.allied_trivia as SummaryOutput["alliedTrivia"]) || [],
              speakers: (dbSummary.speakers as SummaryOutput["speakers"]) || [],
              chapters: (dbSummary.chapters as SummaryOutput["chapters"]) || [],
            };
            setSelectedSummary(transformed);
          } else {
            setSelectedSummary(null);
          }
        }
      } catch (error) {
        console.error("Failed to fetch summary:", error);
        setSelectedSummary(null);
      } finally {
        setSummaryLoading(false);
      }
    }
    fetchSummary();
  }, [selectedId]);

  const selectedItem = contentItems.find((item) => item.id === selectedId);

  const getContentType = (item: ContentItem): "article" | "podcast" | "newsletter" => {
    if (item.contentType === "podcast_episode" || item.contentType === "episode") {
      return "podcast";
    }
    if (item.contentType === "youtube_video") {
      return "podcast"; // Use podcast display for video content (has chapters, speakers)
    }
    return "article";
  };

  return (
    <div className="h-[calc(100vh-8rem)]">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Link href="/" className="p-2 hover:bg-accent rounded-lg transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-xl font-bold">All Content</h1>
          <Badge variant="secondary">{contentItems.length} items</Badge>
        </div>
      </div>

      {/* Split pane layout */}
      <div className="flex gap-4 h-[calc(100%-3rem)]">
        {/* Left pane - Content list */}
        <div
          className={cn(
            "overflow-y-auto rounded-lg border bg-card transition-all",
            selectedId ? "w-1/3 min-w-[300px]" : "w-full"
          )}
        >
          {loading ? (
            <div className="p-4 space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <ContentItemSkeleton key={i} />
              ))}
            </div>
          ) : contentItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-8">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                <BookOpen className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="font-medium mb-1">No content yet</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Subscribe to feeds to start seeing content here.
              </p>
              <Link
                href="/subscriptions?add=true"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90"
              >
                Add Source
              </Link>
            </div>
          ) : (
            <div className="divide-y">
              {contentItems.map((item) => (
                <ContentListItem
                  key={item.id}
                  item={item}
                  isSelected={item.id === selectedId}
                  onClick={() => setSelectedId(item.id === selectedId ? null : item.id)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Right pane - Summary panel */}
        {selectedId && (
          <div className="flex-1 overflow-y-auto rounded-lg border bg-card">
            <div className="sticky top-0 z-10 bg-card border-b px-4 py-3 flex items-center justify-between">
              <div className="flex-1 min-w-0 mr-4">
                <h2 className="font-semibold truncate">{selectedItem?.title}</h2>
                <p className="text-sm text-muted-foreground">
                  {selectedItem?.sourceTitle || "Unknown source"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {selectedItem?.url && (
                  <Button variant="outline" size="sm" asChild>
                    <a
                      href={selectedItem.url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <ExternalLink className="w-4 h-4 mr-1" />
                      Open
                    </a>
                  </Button>
                )}
                {selectedItem?.contentType === "youtube_video" && selectedItem?.youtubeVideoId && (
                  <Button variant="outline" size="sm" asChild>
                    <a
                      href={`https://www.youtube.com/watch?v=${selectedItem.youtubeVideoId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Play className="w-4 h-4 mr-1" />
                      Watch
                    </a>
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setSelectedId(null)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div className="p-4">
              {summaryLoading ? (
                <SummarySkeleton />
              ) : selectedSummary ? (
                <SummaryDisplay
                  summary={selectedSummary}
                  contentType={getContentType(selectedItem!)}
                />
              ) : (
                <NoSummaryState
                  item={selectedItem!}
                  onRefresh={() => {
                    // Trigger re-fetch
                    const currentId = selectedId;
                    setSelectedId(null);
                    setTimeout(() => setSelectedId(currentId), 100);
                  }}
                />
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ContentListItem({
  item,
  isSelected,
  onClick,
}: {
  item: ContentItem;
  isSelected: boolean;
  onClick: () => void;
}) {
  const hasSummary = item.hasSummary;

  const isYouTube = item.contentType === "youtube_video";
  const isPodcast = item.contentType === "podcast_episode" || item.contentType === "episode";

  return (
    <div
      className={cn(
        "p-4 cursor-pointer transition-colors hover:bg-accent/50",
        isSelected && "bg-accent"
      )}
      onClick={onClick}
    >
      <div className="flex gap-3">
        {/* Thumbnail */}
        {(item.youtubeThumbnailUrl || item.imageUrl || item.sourceImageUrl) && (
          <div className="flex-shrink-0">
            <img
              src={item.youtubeThumbnailUrl || item.imageUrl || item.sourceImageUrl}
              alt=""
              className={cn(
                "object-cover rounded",
                isYouTube ? "w-24 h-14" : "w-12 h-12"
              )}
            />
          </div>
        )}

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            {item.sourceImageUrl && !item.youtubeThumbnailUrl && !item.imageUrl && (
              <img
                src={item.sourceImageUrl}
                alt={item.sourceTitle || ""}
                className="w-4 h-4 rounded-sm object-cover"
              />
            )}
            <span className="text-xs text-muted-foreground truncate">
              {isYouTube
                ? item.youtubeChannelName || item.sourceTitle
                : item.sourceTitle || "Unknown"}
            </span>
            {hasSummary && (
              <Sparkles className="w-3 h-3 text-primary flex-shrink-0" />
            )}
            {!hasSummary && item.processingStatus && item.processingStatus !== "completed" && (
              <ProcessingStatusBadge status={item.processingStatus} retryCount={item.retryCount} />
            )}
          </div>

          <h3 className="font-medium text-sm line-clamp-2 mb-1">{item.title}</h3>

          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {item.publishedAt && <span>{formatDate(item.publishedAt)}</span>}
            {item.durationSeconds && (
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {formatDuration(item.durationSeconds)}
              </span>
            )}
            {!isYouTube && !isPodcast && (
              <Badge variant="outline" className="text-xs px-1.5 py-0">
                Article
              </Badge>
            )}
            {isYouTube && (
              <Badge variant="outline" className="text-xs px-1.5 py-0">
                YouTube
              </Badge>
            )}
            {isPodcast && (
              <Badge variant="outline" className="text-xs px-1.5 py-0">
                Podcast
              </Badge>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ContentItemSkeleton() {
  return (
    <div className="p-4">
      <div className="flex gap-3">
        <Skeleton className="w-12 h-12 rounded flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-32" />
        </div>
      </div>
    </div>
  );
}

function SummarySkeleton() {
  return (
    <div className="space-y-4">
      <div className="p-4 rounded-lg border bg-primary/5">
        <div className="flex gap-3">
          <Skeleton className="w-10 h-10 rounded-lg" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        </div>
      </div>
      <div className="p-4 rounded-lg border">
        <Skeleton className="h-5 w-32 mb-4" />
        <div className="space-y-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-4/5" />
        </div>
      </div>
    </div>
  );
}

function NoSummaryState({
  item,
  onRefresh,
}: {
  item: ContentItem;
  onRefresh: () => void;
}) {
  const status = item.processingStatus;

  if (status === "pending" || status === "processing") {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
          <RefreshCw className="w-8 h-8 text-primary animate-spin" />
        </div>
        <h3 className="font-medium mb-1">Generating Summary</h3>
        <p className="text-sm text-muted-foreground max-w-sm">
          This content is being processed. The summary will appear here once ready.
        </p>
      </div>
    );
  }

  if (status === "failed") {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
          <X className="w-8 h-8 text-destructive" />
        </div>
        <h3 className="font-medium mb-1">Summary Failed</h3>
        <p className="text-sm text-muted-foreground mb-4 max-w-sm">
          We couldn't generate a summary for this content. This might be due to
          the content being too short or inaccessible.
        </p>
        <Button variant="outline" size="sm" onClick={onRefresh}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Retry
        </Button>
      </div>
    );
  }

  if (status === "skipped") {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
          <BookOpen className="w-8 h-8 text-muted-foreground" />
        </div>
        <h3 className="font-medium mb-1">No Summary Available</h3>
        <p className="text-sm text-muted-foreground max-w-sm">
          This content was too short or not suitable for summarization.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
        <Sparkles className="w-8 h-8 text-muted-foreground" />
      </div>
      <h3 className="font-medium mb-1">No Summary Yet</h3>
      <p className="text-sm text-muted-foreground mb-4 max-w-sm">
        A summary hasn't been generated for this content yet.
      </p>
      <Button variant="outline" size="sm" onClick={onRefresh}>
        <RefreshCw className="w-4 h-4 mr-2" />
        Check Again
      </Button>
    </div>
  );
}

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}
