"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { SummaryDisplay } from "@/components/content/summary-display";
import {
  ArrowLeft,
  ExternalLink,
  Bookmark,
  BookmarkCheck,
  Share2,
  Clock,
  Calendar,
  Sparkles,
  RefreshCw,
  Play,
  Pause,
  Headphones,
  RotateCcw,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Youtube,
  Video,
} from "lucide-react";
import { cn, formatDate, formatReadingTime, formatDuration } from "@/lib/utils";
import { useAudioStore } from "@/stores/audio-store";

interface ContentDetail {
  id: string;
  contentType: string;
  title: string;
  url?: string;
  author?: string;
  contentHtml?: string;
  contentText?: string;
  excerpt?: string;
  imageUrl?: string;
  mediaUrl?: string;
  durationSeconds?: number;
  publishedAt?: string;
  wordCount?: number;
  readingTimeMinutes?: number;
  processingStatus?: "pending" | "processing" | "completed" | "failed" | "skipped" | "permanently_failed";
  retryCount?: number;
  contentSource?: "rss" | "fetched";
  isSummarizable?: boolean;
  // YouTube-specific fields
  youtubeVideoId?: string;
  youtubeChannelName?: string;
  youtubeChannelId?: string;
  youtubeThumbnailUrl?: string;
  transcriptSource?: "auto" | "manual" | null;
  source: {
    id: string;
    sourceType: string;
    title: string;
    imageUrl?: string;
  };
  summary?: any;
  isRead: boolean;
  isSaved: boolean;
}

export default function ContentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [content, setContent] = useState<ContentDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { currentEpisode, isPlaying, play, pause } = useAudioStore();
  const isCurrentEpisode = currentEpisode?.id === id;
  const isCurrentlyPlaying = isCurrentEpisode && isPlaying;

  useEffect(() => {
    fetchContent();
  }, [id]);

  const fetchContent = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/content/${id}`);
      const data = await response.json();

      if (response.ok) {
        setContent(data.content);
        // Mark as read
        await fetch(`/api/content/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isRead: true }),
        });
      } else {
        setError(data.error || "Failed to load content");
      }
    } catch (err) {
      setError("Failed to load content");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateSummary = async () => {
    if (!content) return;

    setIsSummarizing(true);
    try {
      const response = await fetch(`/api/content/${id}/summary`, {
        method: "POST",
      });
      const data = await response.json();

      if (response.ok) {
        setContent((prev) => (prev ? { ...prev, summary: data.summary } : null));
      } else {
        alert(data.error || "Failed to generate summary");
      }
    } catch (err) {
      alert("Failed to generate summary");
    } finally {
      setIsSummarizing(false);
    }
  };

  const handleRetrySummarization = async () => {
    if (!content) return;

    setIsRetrying(true);
    try {
      const response = await fetch(`/api/content/${id}/retry`, {
        method: "POST",
      });
      const data = await response.json();

      if (response.ok) {
        // Refresh content to get the new summary
        await fetchContent();
      } else {
        alert(data.error || "Failed to retry summarization");
      }
    } catch (err) {
      alert("Failed to retry summarization");
    } finally {
      setIsRetrying(false);
    }
  };

  const handleToggleSave = async () => {
    if (!content) return;

    try {
      await fetch(`/api/content/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isSaved: !content.isSaved }),
      });
      setContent((prev) => (prev ? { ...prev, isSaved: !prev.isSaved } : null));
    } catch (err) {
      console.error("Failed to toggle save");
    }
  };

  const handlePlayPause = () => {
    if (!content?.mediaUrl) return;

    if (isCurrentlyPlaying) {
      pause();
    } else {
      play({
        id: content.id,
        podcastId: content.source.id,
        podcastName: content.source.title,
        episodeTitle: content.title,
        audioUrl: content.mediaUrl,
        coverUrl: content.imageUrl || content.source.imageUrl || "",
        duration: content.durationSeconds || 0,
      });
    }
  };

  if (isLoading) {
    return (
      <div className="p-4 md:p-6 max-w-4xl mx-auto">
        <Skeleton className="h-8 w-32 mb-6" />
        <Skeleton className="h-10 w-3/4 mb-4" />
        <Skeleton className="h-6 w-48 mb-8" />
        <Skeleton className="h-64 w-full mb-6" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (error || !content) {
    return (
      <div className="p-4 md:p-6 max-w-4xl mx-auto">
        <Button variant="ghost" onClick={() => router.back()} className="mb-6">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">{error || "Content not found"}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isPodcast = content.source.sourceType === "podcast";
  const isYouTubeVideo = content.contentType === "youtube_video";

  // For YouTube videos, construct the YouTube URL from the video ID
  const youtubeUrl = isYouTubeVideo && content.youtubeVideoId
    ? `https://www.youtube.com/watch?v=${content.youtubeVideoId}`
    : content.url;

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto pb-24">
      {/* Navigation */}
      <Button variant="ghost" onClick={() => router.back()} className="mb-6">
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back
      </Button>

      {/* Header */}
      <div className="mb-8">
        {/* Content Type Badge for YouTube */}
        {isYouTubeVideo && (
          <div className="mb-4">
            <Badge variant="secondary" className="bg-red-500 text-white">
              <Youtube className="w-3 h-3 mr-1" />
              YouTube Video
            </Badge>
          </div>
        )}

        <div className="flex items-center gap-3 mb-4">
          {isYouTubeVideo ? (
            // YouTube-specific source display
            <div className="w-10 h-10 rounded-lg bg-red-100 dark:bg-red-950/50 flex items-center justify-center">
              <Youtube className="w-5 h-5 text-red-500" />
            </div>
          ) : content.source.imageUrl ? (
            <img
              src={content.source.imageUrl}
              alt=""
              className="w-10 h-10 rounded-lg object-cover"
            />
          ) : null}
          <div>
            <p className="font-medium">
              {isYouTubeVideo ? content.youtubeChannelName || "YouTube" : content.source.title}
            </p>
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              {content.publishedAt && (
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {formatDate(content.publishedAt)}
                </span>
              )}
              {isYouTubeVideo && content.durationSeconds ? (
                <span className="flex items-center gap-1">
                  <Video className="w-3 h-3" />
                  {formatDuration(content.durationSeconds)}
                </span>
              ) : isPodcast && content.durationSeconds ? (
                <span className="flex items-center gap-1">
                  <Headphones className="w-3 h-3" />
                  {formatDuration(content.durationSeconds)}
                </span>
              ) : content.readingTimeMinutes ? (
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {formatReadingTime(content.readingTimeMinutes)}
                </span>
              ) : null}
            </div>
          </div>
        </div>

        <h1 className="text-2xl md:text-3xl font-bold mb-4">{content.title}</h1>

        {content.author && (
          <p className="text-muted-foreground mb-4">By {content.author}</p>
        )}

        {/* Actions */}
        <div className="flex flex-wrap items-center gap-2">
          {isPodcast && content.mediaUrl && (
            <Button onClick={handlePlayPause}>
              {isCurrentlyPlaying ? (
                <>
                  <Pause className="w-4 h-4 mr-2" />
                  Pause
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-2" />
                  Play Episode
                </>
              )}
            </Button>
          )}

          {/* Watch on YouTube button for YouTube videos */}
          {isYouTubeVideo && youtubeUrl && (
            <Button variant="outline" asChild className="border-red-500/30 hover:bg-red-500/10">
              <a href={youtubeUrl} target="_blank" rel="noopener noreferrer">
                <Youtube className="w-4 h-4 mr-2 text-red-500" />
                Watch on YouTube
              </a>
            </Button>
          )}

          {/* View Original for non-YouTube content */}
          {!isYouTubeVideo && content.url && (
            <Button variant="outline" asChild>
              <a href={content.url} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="w-4 h-4 mr-2" />
                View Original
              </a>
            </Button>
          )}

          <Button variant="outline" onClick={handleToggleSave}>
            {content.isSaved ? (
              <>
                <BookmarkCheck className="w-4 h-4 mr-2 text-primary" />
                Saved
              </>
            ) : (
              <>
                <Bookmark className="w-4 h-4 mr-2" />
                Save
              </>
            )}
          </Button>

          <Button variant="ghost" size="icon">
            <Share2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Cover Image */}
      {content.imageUrl && (
        <div className="mb-8 rounded-lg overflow-hidden">
          <img
            src={content.imageUrl}
            alt=""
            className="w-full h-auto max-h-96 object-cover"
          />
        </div>
      )}

      {/* Summary Section */}
      {content.summary ? (
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold">AI Summary</h2>
            <Badge variant="outline" className="text-xs text-green-600 border-green-600/30">
              <CheckCircle2 className="w-3 h-3 mr-1" />
              Completed
            </Badge>
          </div>
          <SummaryDisplay
            summary={content.summary}
            contentType={isPodcast || isYouTubeVideo ? "podcast" : "article"}
          />
        </div>
      ) : (
        <Card className="mb-8">
          <CardContent className="py-8 text-center">
            {/* Status indicator */}
            {content.processingStatus === "failed" || content.processingStatus === "permanently_failed" ? (
              <>
                <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
                <h3 className="font-semibold mb-2 text-destructive">
                  Summarization {content.processingStatus === "permanently_failed" ? "Permanently Failed" : "Failed"}
                </h3>
                <p className="text-muted-foreground mb-2">
                  {content.processingStatus === "permanently_failed"
                    ? "This content failed after multiple retries."
                    : `Attempt ${content.retryCount || 1} failed. Click retry to try again.`}
                </p>
                <Button
                  onClick={handleRetrySummarization}
                  disabled={isRetrying}
                  variant="destructive"
                  className="mt-2"
                >
                  {isRetrying ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Retrying...
                    </>
                  ) : (
                    <>
                      <RotateCcw className="w-4 h-4 mr-2" />
                      Retry Summarization
                    </>
                  )}
                </Button>
              </>
            ) : content.processingStatus === "processing" ? (
              <>
                <Loader2 className="w-12 h-12 text-primary mx-auto mb-4 animate-spin" />
                <h3 className="font-semibold mb-2">Generating Summary...</h3>
                <p className="text-muted-foreground">
                  AI is analyzing this content. This may take a moment.
                </p>
              </>
            ) : content.processingStatus === "skipped" ? (
              <>
                <Sparkles className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-semibold mb-2">Content Skipped</h3>
                <p className="text-muted-foreground mb-4">
                  This content has fewer than {isPodcast ? "500" : "300"} words and was skipped for summarization.
                </p>
                <Button onClick={handleGenerateSummary} disabled={isSummarizing} variant="outline">
                  {isSummarizing ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Generate Anyway
                    </>
                  )}
                </Button>
              </>
            ) : content.processingStatus === "pending" ? (
              <>
                <Clock className="w-12 h-12 text-amber-500 mx-auto mb-4" />
                <h3 className="font-semibold mb-2">Summary Pending</h3>
                <p className="text-muted-foreground mb-4">
                  This content is queued for AI summarization.
                </p>
                <Button onClick={handleGenerateSummary} disabled={isSummarizing}>
                  {isSummarizing ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Generate Now
                    </>
                  )}
                </Button>
              </>
            ) : (
              <>
                <Sparkles className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-semibold mb-2">No summary available</h3>
                <p className="text-muted-foreground mb-4">
                  Generate an AI summary to get key takeaways, insights, and related ideas
                </p>
                <Button onClick={handleGenerateSummary} disabled={isSummarizing}>
                  {isSummarizing ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Generate Summary
                    </>
                  )}
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Original Content */}
      {content.contentHtml ? (
        <div className="prose prose-lg dark:prose-invert max-w-none">
          <h2 className="text-lg font-semibold mb-4">Original Content</h2>
          <div dangerouslySetInnerHTML={{ __html: content.contentHtml }} />
        </div>
      ) : content.contentText ? (
        <div className="prose prose-lg dark:prose-invert max-w-none">
          <h2 className="text-lg font-semibold mb-4">Original Content</h2>
          {content.contentText.split("\n\n").map((paragraph, i) => (
            <p key={i}>{paragraph}</p>
          ))}
        </div>
      ) : null}
    </div>
  );
}
