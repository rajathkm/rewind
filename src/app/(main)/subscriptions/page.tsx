"use client";

import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Plus,
  Search,
  Rss,
  Mail,
  Headphones,
  MoreVertical,
  Trash2,
  Pause,
  Play,
  Upload,
  ExternalLink,
  Sparkles,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Subscription {
  id: string;
  status: "active" | "paused" | "error";
  customName?: string;
  folder?: string;
  autoSummarize: boolean;
  unreadCount: number;
  source: {
    id: string;
    sourceType: "newsletter" | "rss" | "podcast";
    title: string;
    description?: string;
    imageUrl?: string;
    feedUrl?: string;
  };
}

export default function SubscriptionsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "rss" | "podcast" | "newsletter">("all");
  const [isAddingSource, setIsAddingSource] = useState(false);
  const [newSourceUrl, setNewSourceUrl] = useState("");
  const [isValidating, setIsValidating] = useState(false);

  // Mock data - replace with actual data fetching
  const subscriptions: Subscription[] = [];
  const isLoading = false;

  const handleAddSource = async () => {
    if (!newSourceUrl.trim()) return;

    setIsValidating(true);
    try {
      // Validate the URL
      const response = await fetch("/api/sources/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: newSourceUrl }),
      });

      const data = await response.json();

      if (data.isValid) {
        // Create source and subscription
        const sourceRes = await fetch("/api/sources", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sourceType: data.sourceType,
            feedUrl: data.feedUrl,
            title: data.title,
            description: data.description,
            imageUrl: data.imageUrl,
            websiteUrl: data.websiteUrl,
          }),
        });

        const sourceData = await sourceRes.json();

        if (sourceData.source) {
          await fetch("/api/subscriptions", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              sourceId: sourceData.source.id,
              autoSummarize: true,
            }),
          });
        }

        setNewSourceUrl("");
        setIsAddingSource(false);
        // Refresh subscriptions
      } else {
        alert(data.error || "Could not validate this URL");
      }
    } catch (error) {
      console.error("Error adding source:", error);
      alert("Failed to add source");
    } finally {
      setIsValidating(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("/api/import/opml", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        alert(
          `Imported ${data.successful} feeds successfully. ${data.failed} failed.`
        );
        // Refresh subscriptions
      } else {
        alert(data.error || "Failed to import OPML");
      }
    } catch (error) {
      console.error("Error importing OPML:", error);
      alert("Failed to import OPML file");
    }
  };

  const filteredSubscriptions = subscriptions.filter((sub) => {
    if (filter !== "all" && sub.source.sourceType !== filter) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        sub.source.title.toLowerCase().includes(query) ||
        sub.customName?.toLowerCase().includes(query)
      );
    }
    return true;
  });

  const getSourceIcon = (type: string) => {
    switch (type) {
      case "rss":
        return <Rss className="w-4 h-4" />;
      case "podcast":
        return <Headphones className="w-4 h-4" />;
      case "newsletter":
        return <Mail className="w-4 h-4" />;
      default:
        return <Rss className="w-4 h-4" />;
    }
  };

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Subscriptions</h1>
        <div className="flex items-center gap-2">
          <label className="cursor-pointer">
            <input
              type="file"
              accept=".opml,.xml"
              className="hidden"
              onChange={handleFileUpload}
            />
            <Button variant="outline" size="sm" asChild>
              <span>
                <Upload className="w-4 h-4 mr-2" />
                Import OPML
              </span>
            </Button>
          </label>
          <Button size="sm" onClick={() => setIsAddingSource(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Source
          </Button>
        </div>
      </div>

      {/* Add Source Card */}
      {isAddingSource && (
        <Card className="mb-6 border-primary/20">
          <CardHeader className="py-4">
            <CardTitle className="text-base">Add New Source</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="Enter RSS, Podcast, or website URL..."
                value={newSourceUrl}
                onChange={(e) => setNewSourceUrl(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddSource()}
              />
              <Button onClick={handleAddSource} disabled={isValidating}>
                {isValidating ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  "Add"
                )}
              </Button>
              <Button variant="ghost" onClick={() => setIsAddingSource(false)}>
                Cancel
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              Paste a URL to an RSS feed, podcast feed, or website. We'll
              automatically detect the feed.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search subscriptions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2">
          {(["all", "rss", "podcast", "newsletter"] as const).map((type) => (
            <Button
              key={type}
              variant={filter === type ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setFilter(type)}
              className="capitalize"
            >
              {type === "all" ? "All" : type}
            </Button>
          ))}
        </div>
      </div>

      {/* Subscriptions List */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <Skeleton className="w-12 h-12 rounded-lg" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-3 w-72" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredSubscriptions.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
              <Rss className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="font-semibold mb-2">No subscriptions yet</h3>
            <p className="text-muted-foreground mb-4">
              Add RSS feeds, podcasts, or newsletters to get started
            </p>
            <Button onClick={() => setIsAddingSource(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Your First Source
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredSubscriptions.map((subscription) => (
            <Card
              key={subscription.id}
              className={cn(
                "group transition-all hover:shadow-md",
                subscription.status === "paused" && "opacity-60"
              )}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  {/* Source Image */}
                  <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center overflow-hidden flex-shrink-0">
                    {subscription.source.imageUrl ? (
                      <img
                        src={subscription.source.imageUrl}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      getSourceIcon(subscription.source.sourceType)
                    )}
                  </div>

                  {/* Source Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium truncate">
                        {subscription.customName || subscription.source.title}
                      </h3>
                      <Badge variant="outline" className="text-xs capitalize">
                        {subscription.source.sourceType}
                      </Badge>
                      {subscription.autoSummarize && (
                        <Sparkles className="w-3 h-3 text-primary" />
                      )}
                      {subscription.status === "paused" && (
                        <Badge variant="secondary" className="text-xs">
                          Paused
                        </Badge>
                      )}
                    </div>
                    {subscription.source.description && (
                      <p className="text-sm text-muted-foreground line-clamp-1">
                        {subscription.source.description}
                      </p>
                    )}
                    {subscription.unreadCount > 0 && (
                      <p className="text-xs text-primary mt-1">
                        {subscription.unreadCount} unread
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {subscription.source.feedUrl && (
                      <Button variant="ghost" size="icon" asChild>
                        <a
                          href={subscription.source.feedUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      </Button>
                    )}
                    <Button variant="ghost" size="icon">
                      {subscription.status === "paused" ? (
                        <Play className="w-4 h-4" />
                      ) : (
                        <Pause className="w-4 h-4" />
                      )}
                    </Button>
                    <Button variant="ghost" size="icon">
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
