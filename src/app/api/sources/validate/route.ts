import { NextRequest, NextResponse } from "next/server";
import Parser from "rss-parser";

const parser = new Parser({
  customFields: {
    feed: ["image", "itunes:image", "itunes:author"],
    item: ["itunes:duration", "enclosure", "itunes:image"],
  },
});

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
    try {
      const feed = await parser.parseURL(feedUrl);

      // Determine if it's a podcast by checking for audio enclosures
      const hasPodcastItems = feed.items.some(
        (item) => item.enclosure?.type?.includes("audio")
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
      // Feed parsing failed, try to find feed from HTML
      const feedFromHtml = await discoverFeedFromUrl(feedUrl);
      if (feedFromHtml) {
        return NextResponse.json(feedFromHtml);
      }

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
          const urlObj = new URL(url);
          feedUrl = `${urlObj.origin}${feedUrl}`;
        } else if (!feedUrl.startsWith("http")) {
          const urlObj = new URL(url);
          feedUrl = `${urlObj.origin}/${feedUrl}`;
        }

        // Try to parse the discovered feed
        try {
          const feed = await parser.parseURL(feedUrl);
          const hasPodcastItems = feed.items.some(
            (item) => item.enclosure?.type?.includes("audio")
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
        } catch {
          continue;
        }
      }
    }

    return null;
  } catch {
    return null;
  }
}
