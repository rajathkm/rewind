"use client";

import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Youtube,
  Loader2,
  CheckCircle,
  AlertCircle,
  Clock,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface YouTubeSubmitFormProps {
  onSuccess?: (data: YouTubeSubmitResult) => void;
  variant?: "default" | "compact";
  className?: string;
}

interface YouTubeSubmitResult {
  contentId: string;
  status: string;
  hasTranscript: boolean;
  video: {
    id: string;
    title: string;
    channelName: string;
    thumbnailUrl: string;
    durationSeconds?: number;
  };
}

export function YouTubeSubmitForm({
  onSuccess,
  variant = "default",
  className,
}: YouTubeSubmitFormProps) {
  const [url, setUrl] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    data?: YouTubeSubmitResult;
    error?: string;
  } | null>(null);

  const handleSubmit = useCallback(async () => {
    if (!url.trim() || isSubmitting) return;

    setIsSubmitting(true);
    setResult(null);

    try {
      const response = await fetch("/api/content/youtube", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setResult({
          success: true,
          data: {
            contentId: data.contentId,
            status: data.status,
            hasTranscript: data.hasTranscript,
            video: data.video,
          },
        });
        onSuccess?.(data);
      } else {
        setResult({
          success: false,
          error: data.error || "Failed to submit video",
        });
      }
    } catch (error) {
      console.error("Error submitting YouTube video:", error);
      setResult({
        success: false,
        error: "An error occurred. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [url, isSubmitting, onSuccess]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !isSubmitting) {
        handleSubmit();
      }
    },
    [handleSubmit, isSubmitting]
  );

  const reset = useCallback(() => {
    setUrl("");
    setResult(null);
  }, []);

  const formatDuration = (seconds?: number): string => {
    if (!seconds) return "";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  if (variant === "compact") {
    return (
      <div className={cn("space-y-3", className)}>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Youtube className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-red-500" />
            <Input
              placeholder="Paste YouTube URL..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={handleKeyDown}
              className="pl-9"
              disabled={isSubmitting}
            />
          </div>
          <Button
            onClick={handleSubmit}
            disabled={!url.trim() || isSubmitting}
            size="sm"
          >
            {isSubmitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              "Summarize"
            )}
          </Button>
        </div>

        {result && (
          <StatusMessage
            result={result}
            onReset={reset}
            compact
          />
        )}
      </div>
    );
  }

  return (
    <Card className={cn("border-red-500/20", className)}>
      <CardHeader className="py-4">
        <CardTitle className="text-base flex items-center gap-2">
          <Youtube className="w-5 h-5 text-red-500" />
          Summarize YouTube Video
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!result?.success ? (
          <>
            <div className="flex gap-2">
              <Input
                placeholder="Paste a YouTube URL (e.g., youtube.com/watch?v=...)"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={handleKeyDown}
                autoFocus
                disabled={isSubmitting}
              />
              <Button onClick={handleSubmit} disabled={!url.trim() || isSubmitting}>
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  "Summarize"
                )}
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              Paste a YouTube video URL to get an AI-powered summary. Works best
              with videos that have captions.
            </p>
            {result?.error && (
              <StatusMessage result={result} onReset={reset} />
            )}
          </>
        ) : (
          <div className="space-y-4">
            {/* Video Preview */}
            <div className="flex gap-4 p-3 rounded-lg bg-muted/50">
              <div className="w-24 h-16 rounded-md overflow-hidden flex-shrink-0 bg-muted">
                {result.data?.video.thumbnailUrl && (
                  <img
                    src={result.data.video.thumbnailUrl}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-sm line-clamp-2">
                  {result.data?.video.title}
                </h3>
                <p className="text-xs text-muted-foreground mt-1">
                  {result.data?.video.channelName}
                </p>
                <div className="flex items-center gap-2 mt-2">
                  {result.data?.video.durationSeconds && (
                    <Badge variant="secondary" className="text-xs">
                      <Clock className="w-3 h-3 mr-1" />
                      {formatDuration(result.data.video.durationSeconds)}
                    </Badge>
                  )}
                  {result.data?.hasTranscript && (
                    <Badge variant="outline" className="text-xs text-primary">
                      <Sparkles className="w-3 h-3 mr-1" />
                      Summarizing...
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            <StatusMessage result={result} onReset={reset} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function StatusMessage({
  result,
  onReset,
  compact = false,
}: {
  result: {
    success: boolean;
    data?: YouTubeSubmitResult;
    error?: string;
  };
  onReset: () => void;
  compact?: boolean;
}) {
  if (result.success) {
    return (
      <div
        className={cn(
          "flex items-center gap-2 text-sm",
          compact ? "p-2" : "p-3",
          "rounded-lg bg-green-500/10 text-green-600 dark:text-green-400"
        )}
      >
        <CheckCircle className="w-4 h-4 flex-shrink-0" />
        <span className="flex-1">
          {result.data?.hasTranscript
            ? "Video submitted! Summary will be ready shortly."
            : "Video added. Limited summary available (no captions found)."}
        </span>
        <div className="flex items-center gap-2">
          <a
            href={`/content/${result.data?.contentId}`}
            className="text-xs underline hover:no-underline"
          >
            View
          </a>
          <Button variant="ghost" size="sm" onClick={onReset}>
            Add Another
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex items-center gap-2 text-sm",
        compact ? "p-2" : "p-3",
        "rounded-lg bg-destructive/10 text-destructive"
      )}
    >
      <AlertCircle className="w-4 h-4 flex-shrink-0" />
      <span className="flex-1">{result.error}</span>
      <Button variant="ghost" size="sm" onClick={onReset}>
        Try Again
      </Button>
    </div>
  );
}

export type { YouTubeSubmitResult };
