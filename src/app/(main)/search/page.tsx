"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Search, Filter, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ArticleCard } from "@/components/content/article-card";
import { PodcastCard } from "@/components/content/podcast-card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils/cn";
import { useDebouncedCallback } from "@/hooks/use-debounced-callback";

interface SearchResult {
  id: string;
  title: string;
  excerpt: string | null;
  contentType: string;
  imageUrl: string | null;
  publishedAt: string | null;
  durationSeconds: number | null;
  readingTimeMinutes: number | null;
  author: string | null;
  source: {
    id: string;
    title: string;
    source_type: string;
    image_url: string | null;
  } | null;
  hasSummary: boolean;
  summaryHeadline: string | null;
}

interface SearchResponse {
  results: SearchResult[];
  total: number;
  query: string;
  hasMore: boolean;
  message?: string;
}

type ContentFilter = "all" | "article" | "podcast";

export default function SearchPage() {
  return (
    <Suspense fallback={<SearchPageLoading />}>
      <SearchPageContent />
    </Suspense>
  );
}

function SearchPageLoading() {
  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-12 w-full rounded-xl" />
        <div className="flex gap-2">
          <Skeleton className="h-8 w-16 rounded-full" />
          <Skeleton className="h-8 w-20 rounded-full" />
          <Skeleton className="h-8 w-20 rounded-full" />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <SearchResultSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}

function SearchPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("q") || "";
  const initialType = (searchParams.get("type") as ContentFilter) || "all";

  const [query, setQuery] = useState(initialQuery);
  const [filter, setFilter] = useState<ContentFilter>(initialType);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [offset, setOffset] = useState(0);

  const performSearch = useCallback(
    async (searchQuery: string, searchFilter: ContentFilter, searchOffset = 0) => {
      if (searchQuery.length < 2) {
        setResults([]);
        setTotal(0);
        setHasMore(false);
        return;
      }

      setLoading(true);
      try {
        const params = new URLSearchParams({
          q: searchQuery,
          type: searchFilter,
          limit: "20",
          offset: searchOffset.toString(),
        });

        const response = await fetch(`/api/search?${params}`);
        const data: SearchResponse = await response.json();

        if (searchOffset === 0) {
          setResults(data.results);
        } else {
          setResults((prev) => [...prev, ...data.results]);
        }
        setTotal(data.total);
        setHasMore(data.hasMore);
        setOffset(searchOffset + data.results.length);
      } catch (error) {
        console.error("Search error:", error);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const debouncedSearch = useDebouncedCallback(
    (q: string, f: ContentFilter) => {
      performSearch(q, f, 0);
      // Update URL
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      if (f !== "all") params.set("type", f);
      router.replace(`/search?${params.toString()}`, { scroll: false });
    },
    300
  );

  useEffect(() => {
    if (initialQuery) {
      performSearch(initialQuery, initialType, 0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleQueryChange = (newQuery: string) => {
    setQuery(newQuery);
    debouncedSearch(newQuery, filter);
  };

  const handleFilterChange = (newFilter: ContentFilter) => {
    setFilter(newFilter);
    debouncedSearch(query, newFilter);
  };

  const loadMore = () => {
    if (!loading && hasMore) {
      performSearch(query, filter, offset);
    }
  };

  const clearSearch = () => {
    setQuery("");
    setResults([]);
    setTotal(0);
    setHasMore(false);
    router.replace("/search", { scroll: false });
  };

  return (
    <div className="space-y-6">
      {/* Search Header */}
      <div className="space-y-4">
        <h1 className="text-2xl font-bold tracking-tight">Search</h1>

        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <input
            type="text"
            value={query}
            onChange={(e) => handleQueryChange(e.target.value)}
            placeholder="Search articles, podcasts, and more..."
            className="w-full h-12 pl-10 pr-10 rounded-xl border bg-background focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
            autoFocus
          />
          {query && (
            <button
              onClick={clearSearch}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-muted"
            >
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          )}
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          {(["all", "article", "podcast"] as const).map((type) => (
            <button
              key={type}
              onClick={() => handleFilterChange(type)}
              className={cn(
                "px-3 py-1.5 rounded-full text-sm font-medium transition-colors",
                filter === type
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted hover:bg-muted/80 text-muted-foreground"
              )}
            >
              {type === "all" ? "All" : type === "article" ? "Articles" : "Podcasts"}
            </button>
          ))}
        </div>
      </div>

      {/* Results */}
      <div className="space-y-4">
        {/* Results Count */}
        {query.length >= 2 && !loading && (
          <p className="text-sm text-muted-foreground">
            {total === 0
              ? "No results found"
              : `Found ${total} result${total === 1 ? "" : "s"}`}
          </p>
        )}

        {/* Loading State */}
        {loading && results.length === 0 && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <SearchResultSkeleton key={i} />
            ))}
          </div>
        )}

        {/* Results Grid */}
        {results.length > 0 && (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {results.map((item) => {
                if (item.contentType === "podcast_episode") {
                  return (
                    <ContentLink key={item.id} href={`/content/${item.id}`}>
                      <PodcastCard
                        id={item.id}
                        title={item.title}
                        sourceTitle={item.source?.title || "Unknown"}
                        sourceImageUrl={item.source?.image_url || undefined}
                        imageUrl={item.imageUrl || undefined}
                        durationSeconds={item.durationSeconds || undefined}
                        publishedAt={item.publishedAt || undefined}
                        hasSummary={item.hasSummary}
                        description={item.summaryHeadline || item.excerpt || undefined}
                      />
                    </ContentLink>
                  );
                }

                return (
                  <ContentLink key={item.id} href={`/content/${item.id}`}>
                    <ArticleCard
                      id={item.id}
                      title={item.title}
                      sourceTitle={item.source?.title || "Unknown"}
                      sourceImageUrl={item.source?.image_url || undefined}
                      imageUrl={item.imageUrl || undefined}
                      publishedAt={item.publishedAt || undefined}
                      hasSummary={item.hasSummary}
                      excerpt={item.summaryHeadline || item.excerpt || undefined}
                    />
                  </ContentLink>
                );
              })}
            </div>

            {/* Load More */}
            {hasMore && (
              <div className="flex justify-center pt-4">
                <Button
                  variant="outline"
                  onClick={loadMore}
                  disabled={loading}
                  className="min-w-[120px]"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
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

        {/* Empty State */}
        {query.length < 2 && !loading && results.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <Search className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="font-medium mb-1">Search your content</h3>
            <p className="text-sm text-muted-foreground max-w-sm">
              Find articles, podcasts, and summaries across all your subscriptions.
            </p>
          </div>
        )}

        {/* No Results */}
        {query.length >= 2 && !loading && results.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <span className="text-2xl">🔍</span>
            </div>
            <h3 className="font-medium mb-1">No results found</h3>
            <p className="text-sm text-muted-foreground max-w-sm">
              Try searching with different keywords or check your spelling.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function SearchResultSkeleton() {
  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      <Skeleton className="aspect-[2/1]" />
      <div className="p-4 space-y-3">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-5 w-full" />
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
      </div>
    </div>
  );
}

function ContentLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link href={href} className="block">
      {children}
    </Link>
  );
}
