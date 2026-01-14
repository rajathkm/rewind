import { NextRequest, NextResponse } from "next/server";
import Parser from "rss-parser";

const parser = new Parser({
  timeout: 30000, // 30 second timeout for large feeds
  customFields: {
    feed: ["image", "itunes:image", "itunes:author"],
    item: ["itunes:duration", "enclosure", "itunes:image"],
  },
});

// Helper to parse feed with timeout
// Note: Large feeds like Tim Ferriss (29MB, 851 episodes) need more time
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function parseWithTimeout(url: string, timeoutMs = 30000): Promise<any> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    // First fetch the feed content
    console.log(`[Validate] Fetching URL: ${url}`);
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Rewind/1.0 (RSS Feed Reader)",
        "Accept": "application/rss+xml, application/atom+xml, application/xml, text/xml, */*",
      },
    });

    console.log(`[Validate] Response status: ${response.status}, content-type: ${response.headers.get("content-type")}`);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const text = await response.text();
    clearTimeout(timeoutId);
    console.log(`[Validate] Received ${text.length} bytes, first 200 chars: ${text.slice(0, 200)}`);

    // Parse the fetched content
    const parsed = await parser.parseString(text);
    console.log(`[Validate] Parsed successfully, title: ${parsed.title}`);
    return parsed;
  } catch (error) {
    clearTimeout(timeoutId);
    console.error(`[Validate] Parse error for ${url}:`, error);
    throw error;
  }
}

interface ValidatedFeed {
  isValid: boolean;
  sourceType: "rss" | "podcast";
  title: string;
  description?: string;
  author?: string;
  imageUrl?: string;
  feedUrl: string;
  websiteUrl?: string;
  itemCount: number;
  lastPublished?: string;
  error?: string;
}

export async function POST(request: NextRequest) {
  try {
    // Note: Auth check removed for development - add back for production
    const { url } = await request.json();

    if (!url || typeof url !== "string") {
      return NextResponse.json(
        { error: "URL is required" },
        { status: 400 }
      );
    }

    // Clean and validate URL
    let feedUrl = url.trim();
    if (!feedUrl.startsWith("http://") && !feedUrl.startsWith("https://")) {
      feedUrl = `https://${feedUrl}`;
    }

    try {
      new URL(feedUrl);
    } catch {
      return NextResponse.json(
        { error: "Invalid URL format" },
        { status: 400 }
      );
    }

    // Try to fetch and parse the feed
    console.log(`[Validate] Attempting to parse URL: ${feedUrl}`);
    try {
      const feed = await parseWithTimeout(feedUrl);
      console.log(`[Validate] Successfully parsed feed: ${feed.title}, items: ${feed.items?.length || 0}`);

      // Determine if it's a podcast by checking for audio enclosures
      const hasPodcastItems = feed.items.some(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (item: any) => item.enclosure?.type?.includes("audio")
      );

      const result: ValidatedFeed = {
        isValid: true,
        sourceType: hasPodcastItems ? "podcast" : "rss",
        title: feed.title || "Untitled Feed",
        description: feed.description,
        author: (feed as any)["itunes:author"] || (feed as any).creator,
        imageUrl:
          (feed as any)["itunes:image"]?.href ||
          (feed.image as any)?.url ||
          undefined,
        feedUrl,
        websiteUrl: feed.link,
        itemCount: feed.items.length,
        lastPublished: feed.items[0]?.pubDate,
      };

      return NextResponse.json(result);
    } catch (parseError) {
      console.log(`[Validate] Direct parse failed, trying discovery for: ${feedUrl}`, parseError);
      // Feed parsing failed, try to find feed from HTML
      const feedFromHtml = await discoverFeedFromUrl(feedUrl);
      if (feedFromHtml) {
        console.log(`[Validate] Discovered feed: ${feedFromHtml.feedUrl}`);
        return NextResponse.json(feedFromHtml);
      }

      console.log(`[Validate] All discovery methods failed for: ${feedUrl}`);
      return NextResponse.json(
        {
          isValid: false,
          error: "Could not parse as RSS/Atom feed. Try providing a direct feed URL.",
        },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("Error validating URL:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

async function discoverFeedFromUrl(url: string): Promise<ValidatedFeed | null> {
  const urlObj = new URL(url);

  // First, try common feed URL patterns (works for Substack, WordPress, etc.)
  const commonFeedPaths = [
    "/feed",
    "/rss",
    "/feed.xml",
    "/rss.xml",
    "/atom.xml",
    "/feeds/posts/default", // Blogger
    "/?feed=rss2", // WordPress
  ];

  for (const path of commonFeedPaths) {
    const feedUrl = path.startsWith("?")
      ? `${urlObj.origin}${urlObj.pathname}${path}`
      : `${urlObj.origin}${path}`;

    console.log(`[Validate] Trying common path: ${feedUrl}`);
    try {
      const feed = await parseWithTimeout(feedUrl, 15000); // 5 second timeout per attempt
      if (feed && feed.items && feed.items.length > 0) {
        console.log(`[Validate] Found feed at: ${feedUrl} with ${feed.items.length} items`);
        const hasPodcastItems = feed.items.some(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (item: any) => item.enclosure?.type?.includes("audio")
        );

        return {
          isValid: true,
          sourceType: hasPodcastItems ? "podcast" : "rss",
          title: feed.title || "Untitled Feed",
          description: feed.description,
          author: (feed as any)["itunes:author"] || (feed as any).creator,
          imageUrl:
            (feed as any)["itunes:image"]?.href ||
            (feed.image as any)?.url ||
            undefined,
          feedUrl,
          websiteUrl: url,
          itemCount: feed.items.length,
          lastPublished: feed.items[0]?.pubDate,
        };
      }
    } catch (err) {
      console.log(`[Validate] Path ${path} failed:`, err instanceof Error ? err.message : err);
      // Continue to next pattern
    }
  }

  // Then try to discover from HTML link tags
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Rewind/1.0 (RSS Feed Reader)",
      },
    });

    if (!response.ok) {
      return null;
    }

    const html = await response.text();

    // Look for RSS/Atom feed links in HTML
    const feedPatterns = [
      /<link[^>]*type=["']application\/rss\+xml["'][^>]*href=["']([^"']+)["']/i,
      /<link[^>]*type=["']application\/atom\+xml["'][^>]*href=["']([^"']+)["']/i,
      /<link[^>]*href=["']([^"']+)["'][^>]*type=["']application\/rss\+xml["']/i,
      /<link[^>]*href=["']([^"']+)["'][^>]*type=["']application\/atom\+xml["']/i,
    ];

    for (const pattern of feedPatterns) {
      const match = html.match(pattern);
      if (match && match[1]) {
        let feedUrl = match[1];

        // Handle relative URLs
        if (feedUrl.startsWith("/")) {
          feedUrl = `${urlObj.origin}${feedUrl}`;
        } else if (!feedUrl.startsWith("http")) {
          feedUrl = `${urlObj.origin}/${feedUrl}`;
        }

        // Try to parse the discovered feed
        console.log(`[Validate] Found link tag, trying: ${feedUrl}`);
        try {
          const feed = await parseWithTimeout(feedUrl, 15000);
          const hasPodcastItems = feed.items.some(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (item: any) => item.enclosure?.type?.includes("audio")
          );

          console.log(`[Validate] Successfully parsed from link tag: ${feedUrl}`);
          return {
            isValid: true,
            sourceType: hasPodcastItems ? "podcast" : "rss",
            title: feed.title || "Untitled Feed",
            description: feed.description,
            author: (feed as any)["itunes:author"] || (feed as any).creator,
            imageUrl:
              (feed as any)["itunes:image"]?.href ||
              (feed.image as any)?.url ||
              undefined,
            feedUrl,
            websiteUrl: url,
            itemCount: feed.items.length,
            lastPublished: feed.items[0]?.pubDate,
          };
        } catch (err) {
          console.log(`[Validate] Link tag URL failed:`, err instanceof Error ? err.message : err);
          continue;
        }
      }
    }

    return null;
  } catch {
    return null;
  }
}
