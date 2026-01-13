"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@radix-ui/react-tabs";
import { ArticleCard } from "./article-card";
import { PodcastCard } from "./podcast-card";
import { YouTubeCard } from "./youtube-card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Newspaper,
  Headphones,
  Mail,
  Youtube,
  LayoutGrid,
  List,
  Search,
  Filter,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ProcessingStatus } from "./processing-status-badge";

interface ContentItem {
  id: string;
  contentType: "article" | "episode" | "newsletter_issue" | "youtube_video";
  title: string;
  excerpt?: string;
  sourceId: string;
  sourceTitle: string;
  sourceType: "newsletter" | "rss" | "podcast" | "youtube";
  sourceImageUrl?: string;
  imageUrl?: string;
  url?: string;
  mediaUrl?: string;
  publishedAt?: string;
  durationSeconds?: number;
  readingTimeMinutes?: number;
  isRead?: boolean;
  isSaved?: boolean;
  hasSummary?: boolean;
  processingStatus?: ProcessingStatus;
  retryCount?: number;
  isDownloaded?: boolean;
  playbackProgress?: number;
  // YouTube-specific
  youtubeVideoId?: string;
  youtubeChannelName?: string;
}

interface ContentFeedProps {
  items: ContentItem[];
  isLoading?: boolean;
  hasMore?: boolean;
  onLoadMore?: () => void;
  onItemClick?: (item: ContentItem) => void;
  onSave?: (item: ContentItem) => void;
  onMarkRead?: (item: ContentItem) => void;
  onDownload?: (item: ContentItem) => void;
  onRefresh?: () => void;
}

export function ContentFeed({
  items,
  isLoading = false,
  hasMore = false,
  onLoadMore,
  onItemClick,
  onSave,
  onMarkRead,
  onDownload,
  onRefresh,
}: ContentFeedProps) {
  const [filter, setFilter] = useState<"all" | "articles" | "podcasts" | "newsletters" | "youtube">("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("list");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredItems = items.filter((item) => {
    // Filter by type
    if (filter === "articles" && item.sourceType !== "rss") return false;
    if (filter === "podcasts" && item.sourceType !== "podcast") return false;
    if (filter === "newsletters" && item.sourceType !== "newsletter") return false;
    if (filter === "youtube" && item.contentType !== "youtube_video") return false;

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        item.title.toLowerCase().includes(query) ||
        item.sourceTitle.toLowerCase().includes(query) ||
        item.excerpt?.toLowerCase().includes(query)
      );
    }

    return true;
  });

  const renderItem = (item: ContentItem) => {
    const variant = viewMode === "grid" ? "default" : "compact";

    if (item.contentType === "youtube_video") {
      return (
        <YouTubeCard
          key={item.id}
          id={item.id}
          title={item.title}
          channelName={item.youtubeChannelName || item.sourceTitle}
          thumbnailUrl={item.imageUrl}
          publishedAt={item.publishedAt}
          durationSeconds={item.durationSeconds}
          videoId={item.youtubeVideoId}
          isRead={item.isRead}
          isSaved={item.isSaved}
          hasSummary={item.hasSummary}
          processingStatus={item.processingStatus}
          retryCount={item.retryCount}
          variant={variant}
          onClick={() => onItemClick?.(item)}
          onSave={() => onSave?.(item)}
        />
      );
    }

    if (item.sourceType === "podcast") {
      return (
        <PodcastCard
          key={item.id}
          id={item.id}
          title={item.title}
          description={item.excerpt}
          sourceTitle={item.sourceTitle}
          sourceImageUrl={item.sourceImageUrl}
          imageUrl={item.imageUrl}
          publishedAt={item.publishedAt}
          durationSeconds={item.durationSeconds}
          mediaUrl={item.mediaUrl}
          isRead={item.isRead}
          isSaved={item.isSaved}
          hasSummary={item.hasSummary}
          processingStatus={item.processingStatus}
          retryCount={item.retryCount}
          isDownloaded={item.isDownloaded}
          playbackProgress={item.playbackProgress}
          variant={variant}
          onClick={() => onItemClick?.(item)}
          onSave={() => onSave?.(item)}
          onDownload={() => onDownload?.(item)}
        />
      );
    }

    return (
      <ArticleCard
        key={item.id}
        id={item.id}
        title={item.title}
        excerpt={item.excerpt}
        sourceTitle={item.sourceTitle}
        sourceImageUrl={item.sourceImageUrl}
        imageUrl={item.imageUrl}
        publishedAt={item.publishedAt}
        readingTimeMinutes={item.readingTimeMinutes}
        isRead={item.isRead}
        isSaved={item.isSaved}
        hasSummary={item.hasSummary}
        processingStatus={item.processingStatus}
        retryCount={item.retryCount}
        variant={variant}
        onClick={() => onItemClick?.(item)}
        onSave={() => onSave?.(item)}
        onMarkRead={() => onMarkRead?.(item)}
      />
    );
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search content..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button variant="outline" size="icon" onClick={onRefresh}>
            <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
          </Button>
        </div>

        <div className="flex items-center gap-2">
          {/* View Mode Toggle */}
          <div className="flex items-center border rounded-md">
            <Button
              variant={viewMode === "list" ? "secondary" : "ghost"}
              size="sm"
              className="rounded-r-none"
              onClick={() => setViewMode("list")}
            >
              <List className="w-4 h-4" />
            </Button>
            <Button
              variant={viewMode === "grid" ? "secondary" : "ghost"}
              size="sm"
              className="rounded-l-none"
              onClick={() => setViewMode("grid")}
            >
              <LayoutGrid className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        <Button
          variant={filter === "all" ? "secondary" : "ghost"}
          size="sm"
          onClick={() => setFilter("all")}
        >
          All
        </Button>
        <Button
          variant={filter === "articles" ? "secondary" : "ghost"}
          size="sm"
          onClick={() => setFilter("articles")}
        >
          <Newspaper className="w-4 h-4 mr-1.5" />
          Articles
        </Button>
        <Button
          variant={filter === "podcasts" ? "secondary" : "ghost"}
          size="sm"
          onClick={() => setFilter("podcasts")}
        >
          <Headphones className="w-4 h-4 mr-1.5" />
          Podcasts
        </Button>
        <Button
          variant={filter === "youtube" ? "secondary" : "ghost"}
          size="sm"
          onClick={() => setFilter("youtube")}
        >
          <Youtube className="w-4 h-4 mr-1.5" />
          YouTube
        </Button>
        <Button
          variant={filter === "newsletters" ? "secondary" : "ghost"}
          size="sm"
          onClick={() => setFilter("newsletters")}
        >
          <Mail className="w-4 h-4 mr-1.5" />
          Newsletters
        </Button>
      </div>

      {/* Content Grid/List */}
      {isLoading && items.length === 0 ? (
        <div
          className={cn(
            viewMode === "grid"
              ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
              : "space-y-3"
          )}
        >
          {Array.from({ length: 6 }).map((_, i) => (
            <ContentSkeleton key={i} variant={viewMode === "grid" ? "default" : "compact"} />
          ))}
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">
            {searchQuery ? "No results found" : "No content yet"}
          </p>
          {searchQuery && (
            <Button variant="link" onClick={() => setSearchQuery("")}>
              Clear search
            </Button>
          )}
        </div>
      ) : (
        <>
          <div
            className={cn(
              viewMode === "grid"
                ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
                : "space-y-3"
            )}
          >
            {filteredItems.map(renderItem)}
          </div>

          {hasMore && (
            <div className="flex justify-center pt-4">
              <Button variant="outline" onClick={onLoadMore} disabled={isLoading}>
                {isLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Loading...
                  </>
                ) : (
                  "Load more"
                )}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function ContentSkeleton({ variant = "default" }: { variant?: "default" | "compact" }) {
  if (variant === "compact") {
    return (
      <div className="flex items-center gap-3 p-3 border rounded-lg">
        <Skeleton className="w-12 h-12 rounded-lg" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-3 w-32" />
        </div>
      </div>
    );
  }

  return (
    <div className="border rounded-lg p-4 space-y-3">
      <div className="flex gap-4">
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-5 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-24" />
        </div>
        <Skeleton className="w-24 h-24 rounded-lg flex-shrink-0" />
      </div>
    </div>
  );
}

export type { ContentItem };
