/**
 * Podcast Discovery Service
 *
 * Provides robust podcast fetching and discovery similar to Spotify/Apple Podcasts.
 * Uses iTunes Search API as the primary source with fallbacks.
 *
 * Features:
 * - Search podcasts by name, topic, or keyword
 * - Get podcast details and episode list
 * - Fetch episode transcripts when available
 * - Handle RSS feed parsing with fallback
 */

import Parser from "rss-parser";

// ============================================================================
// Types
// ============================================================================

export interface PodcastSearchResult {
  id: string;
  itunesId?: number;
  title: string;
  author: string;
  description: string;
  artworkUrl: string;
  feedUrl: string;
  genre: string;
  trackCount: number;
  releaseDate?: string;
  country?: string;
  explicit: boolean;
}

export interface PodcastDetails {
  id: string;
  itunesId?: number;
  title: string;
  author: string;
  description: string;
  artworkUrl: string;
  feedUrl: string;
  websiteUrl?: string;
  genres: string[];
  language: string;
  country?: string;
  explicit: boolean;
  episodeCount: number;
  latestEpisodeDate?: string;
  episodes: PodcastEpisode[];
}

export interface PodcastEpisode {
  id: string;
  guid: string;
  title: string;
  description: string;
  summary?: string;
  audioUrl: string;
  durationSeconds?: number;
  publishedAt?: string;
  imageUrl?: string;
  episodeNumber?: number;
  seasonNumber?: number;
  explicit: boolean;
  transcript?: string;
  transcriptUrl?: string;
}

export interface DiscoveryError {
  code: "NOT_FOUND" | "INVALID_FEED" | "NETWORK_ERROR" | "RATE_LIMITED" | "PARSE_ERROR";
  message: string;
  isRetryable: boolean;
}

// ============================================================================
// iTunes Search API
// ============================================================================

const ITUNES_SEARCH_URL = "https://itunes.apple.com/search";
const ITUNES_LOOKUP_URL = "https://itunes.apple.com/lookup";

interface ITunesPodcastResult {
  trackId: number;
  trackName: string;
  artistName: string;
  collectionName?: string;
  feedUrl: string;
  artworkUrl600?: string;
  artworkUrl100?: string;
  primaryGenreName: string;
  genres?: string[];
  trackCount: number;
  releaseDate: string;
  country: string;
  collectionExplicitness: string;
  contentAdvisoryRating?: string;
}

interface ITunesSearchResponse {
  resultCount: number;
  results: ITunesPodcastResult[];
}

/**
 * Search for podcasts using iTunes Search API
 */
export async function searchPodcasts(
  query: string,
  options: {
    limit?: number;
    country?: string;
    explicit?: boolean;
  } = {}
): Promise<{ results: PodcastSearchResult[]; error?: DiscoveryError }> {
  const { limit = 20, country = "US", explicit = true } = options;

  try {
    const params = new URLSearchParams({
      term: query,
      media: "podcast",
      entity: "podcast",
      limit: String(limit),
      country,
    });

    if (!explicit) {
      params.set("explicit", "No");
    }

    const response = await fetch(`${ITUNES_SEARCH_URL}?${params}`, {
      headers: {
        "User-Agent": "Rewind/1.0 (+https://rewind.app)",
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      if (response.status === 429) {
        return {
          results: [],
          error: {
            code: "RATE_LIMITED",
            message: "Too many requests. Please try again later.",
            isRetryable: true,
          },
        };
      }
      return {
        results: [],
        error: {
          code: "NETWORK_ERROR",
          message: `iTunes API returned ${response.status}`,
          isRetryable: true,
        },
      };
    }

    const data: ITunesSearchResponse = await response.json();

    const results: PodcastSearchResult[] = data.results.map((item) => ({
      id: `itunes-${item.trackId}`,
      itunesId: item.trackId,
      title: item.trackName || item.collectionName || "Unknown",
      author: item.artistName,
      description: "", // iTunes search doesn't include description
      artworkUrl: item.artworkUrl600 || item.artworkUrl100 || "",
      feedUrl: item.feedUrl,
      genre: item.primaryGenreName,
      trackCount: item.trackCount,
      releaseDate: item.releaseDate,
      country: item.country,
      explicit: item.collectionExplicitness === "explicit" ||
        item.contentAdvisoryRating === "Explicit",
    }));

    return { results };
  } catch (error) {
    console.error("[Podcast Discovery] Search error:", error);
    return {
      results: [],
      error: {
        code: "NETWORK_ERROR",
        message: error instanceof Error ? error.message : "Search failed",
        isRetryable: true,
      },
    };
  }
}

/**
 * Get podcast details by iTunes ID
 */
export async function getPodcastByItunesId(
  itunesId: number
): Promise<{ podcast: PodcastDetails | null; error?: DiscoveryError }> {
  try {
    const params = new URLSearchParams({
      id: String(itunesId),
      entity: "podcast",
    });

    const response = await fetch(`${ITUNES_LOOKUP_URL}?${params}`, {
      headers: {
        "User-Agent": "Rewind/1.0 (+https://rewind.app)",
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      return {
        podcast: null,
        error: {
          code: "NETWORK_ERROR",
          message: `iTunes API returned ${response.status}`,
          isRetryable: true,
        },
      };
    }

    const data: ITunesSearchResponse = await response.json();

    if (data.resultCount === 0 || !data.results[0]) {
      return {
        podcast: null,
        error: {
          code: "NOT_FOUND",
          message: "Podcast not found",
          isRetryable: false,
        },
      };
    }

    const item = data.results[0];

    // Fetch the RSS feed for full details and episodes
    const feedResult = await fetchPodcastFeed(item.feedUrl);
    if (feedResult.error) {
      return { podcast: null, error: feedResult.error };
    }

    return {
      podcast: {
        id: `itunes-${item.trackId}`,
        itunesId: item.trackId,
        title: item.trackName || feedResult.podcast?.title || "Unknown",
        author: item.artistName || feedResult.podcast?.author || "Unknown",
        description: feedResult.podcast?.description || "",
        artworkUrl: item.artworkUrl600 || feedResult.podcast?.artworkUrl || "",
        feedUrl: item.feedUrl,
        websiteUrl: feedResult.podcast?.websiteUrl,
        genres: item.genres || [item.primaryGenreName],
        language: feedResult.podcast?.language || "en",
        country: item.country,
        explicit: item.collectionExplicitness === "explicit",
        episodeCount: feedResult.podcast?.episodeCount || item.trackCount,
        latestEpisodeDate: feedResult.podcast?.latestEpisodeDate,
        episodes: feedResult.podcast?.episodes || [],
      },
    };
  } catch (error) {
    console.error("[Podcast Discovery] Lookup error:", error);
    return {
      podcast: null,
      error: {
        code: "NETWORK_ERROR",
        message: error instanceof Error ? error.message : "Lookup failed",
        isRetryable: true,
      },
    };
  }
}

// ============================================================================
// RSS Feed Parsing
// ============================================================================

interface CustomFeedItem {
  duration?: string;
  itunesImage?: { href?: string } | string;
  itunesAuthor?: string;
  itunesSummary?: string;
  itunesEpisode?: string;
  itunesSeason?: string;
  itunesExplicit?: string;
  contentEncoded?: string;
  transcript?: string;
  "podcast:transcript"?: Array<{ $: { url: string; type: string } }>;
}

interface CustomFeed {
  itunesImage?: { href?: string } | string;
  itunesAuthor?: string;
  itunesSummary?: string;
  language?: string;
  link?: string;
}

const parser = new Parser<CustomFeed, CustomFeedItem>({
  timeout: 30000,
  maxRedirects: 5,
  headers: {
    "User-Agent": "Rewind/1.0 (+https://rewind.app)",
    Accept: "application/rss+xml, application/xml, text/xml, */*",
  },
  customFields: {
    item: [
      ["itunes:duration", "duration"],
      ["itunes:image", "itunesImage"],
      ["itunes:author", "itunesAuthor"],
      ["itunes:summary", "itunesSummary"],
      ["itunes:episode", "itunesEpisode"],
      ["itunes:season", "itunesSeason"],
      ["itunes:explicit", "itunesExplicit"],
      ["content:encoded", "contentEncoded"],
      ["podcast:transcript", "podcast:transcript"],
    ],
    feed: [
      "itunesImage",
      "itunesAuthor",
      "itunesSummary",
      "language",
    ],
  },
});

interface ParsedPodcast {
  title: string;
  author: string;
  description: string;
  artworkUrl: string;
  websiteUrl?: string;
  language: string;
  episodeCount: number;
  latestEpisodeDate?: string;
  episodes: PodcastEpisode[];
}

/**
 * Fetch and parse a podcast RSS feed
 */
export async function fetchPodcastFeed(
  feedUrl: string,
  options: { maxEpisodes?: number } = {}
): Promise<{ podcast: ParsedPodcast | null; error?: DiscoveryError }> {
  const { maxEpisodes = 50 } = options;

  try {
    console.log(`[Podcast Discovery] Fetching feed: ${feedUrl}`);
    const feed = await parser.parseURL(feedUrl);

    if (!feed || !feed.items) {
      return {
        podcast: null,
        error: {
          code: "INVALID_FEED",
          message: "Feed could not be parsed",
          isRetryable: false,
        },
      };
    }

    // Extract feed-level artwork
    let artworkUrl = "";
    if (feed.itunesImage) {
      if (typeof feed.itunesImage === "string") {
        artworkUrl = feed.itunesImage;
      } else if (feed.itunesImage.href) {
        artworkUrl = feed.itunesImage.href;
      }
    }
    if (!artworkUrl && feed.image?.url) {
      artworkUrl = feed.image.url;
    }

    // Parse episodes
    const episodes: PodcastEpisode[] = feed.items
      .slice(0, maxEpisodes)
      .map((item, index) => {
        // Extract audio URL from enclosure
        const audioUrl = item.enclosure?.url || "";

        // Parse duration
        let durationSeconds: number | undefined;
        if (item.duration) {
          durationSeconds = parseDuration(String(item.duration));
        }

        // Extract episode image
        let imageUrl: string | undefined;
        if (item.itunesImage) {
          if (typeof item.itunesImage === "string") {
            imageUrl = item.itunesImage;
          } else if (item.itunesImage.href) {
            imageUrl = item.itunesImage.href;
          }
        }

        // Extract transcript URL if available (Podcast 2.0 namespace)
        let transcriptUrl: string | undefined;
        const transcriptTag = item["podcast:transcript"];
        if (Array.isArray(transcriptTag) && transcriptTag.length > 0) {
          // Prefer SRT or VTT formats
          const preferred = transcriptTag.find(
            (t) => t.$?.type?.includes("srt") || t.$?.type?.includes("vtt")
          );
          transcriptUrl = preferred?.$?.url || transcriptTag[0]?.$?.url;
        }

        return {
          id: `episode-${index}-${Date.now()}`,
          guid: item.guid || item.link || `${feedUrl}-${index}`,
          title: item.title || "Untitled Episode",
          description: item.itunesSummary || item.contentSnippet || item.content || "",
          summary: item.itunesSummary,
          audioUrl,
          durationSeconds,
          publishedAt: item.pubDate ? new Date(item.pubDate).toISOString() : undefined,
          imageUrl: imageUrl || artworkUrl,
          episodeNumber: item.itunesEpisode ? parseInt(item.itunesEpisode, 10) : undefined,
          seasonNumber: item.itunesSeason ? parseInt(item.itunesSeason, 10) : undefined,
          explicit: item.itunesExplicit === "yes" || item.itunesExplicit === "true",
          transcriptUrl,
        };
      });

    // Sort episodes by date (newest first)
    episodes.sort((a, b) => {
      if (!a.publishedAt || !b.publishedAt) return 0;
      return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
    });

    return {
      podcast: {
        title: feed.title || "Unknown Podcast",
        author: feed.itunesAuthor || "Unknown",
        description: feed.itunesSummary || feed.description || "",
        artworkUrl,
        websiteUrl: feed.link,
        language: feed.language || "en",
        episodeCount: feed.items.length,
        latestEpisodeDate: episodes[0]?.publishedAt,
        episodes,
      },
    };
  } catch (error) {
    console.error("[Podcast Discovery] Feed parsing error:", error);
    return {
      podcast: null,
      error: {
        code: "PARSE_ERROR",
        message: error instanceof Error ? error.message : "Failed to parse feed",
        isRetryable: false,
      },
    };
  }
}

/**
 * Fetch transcript for an episode if available
 */
export async function fetchEpisodeTranscript(
  transcriptUrl: string
): Promise<{ transcript: string | null; error?: DiscoveryError }> {
  try {
    console.log(`[Podcast Discovery] Fetching transcript: ${transcriptUrl}`);

    const response = await fetch(transcriptUrl, {
      headers: {
        "User-Agent": "Rewind/1.0 (+https://rewind.app)",
        Accept: "text/plain, text/srt, text/vtt, */*",
      },
    });

    if (!response.ok) {
      return {
        transcript: null,
        error: {
          code: "NETWORK_ERROR",
          message: `Transcript fetch returned ${response.status}`,
          isRetryable: true,
        },
      };
    }

    const text = await response.text();

    // Parse SRT/VTT format to plain text
    const plainText = parseSubtitleToText(text);

    return { transcript: plainText };
  } catch (error) {
    console.error("[Podcast Discovery] Transcript fetch error:", error);
    return {
      transcript: null,
      error: {
        code: "NETWORK_ERROR",
        message: error instanceof Error ? error.message : "Failed to fetch transcript",
        isRetryable: true,
      },
    };
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Parse duration string to seconds
 * Handles formats: "HH:MM:SS", "MM:SS", "SSSS" (seconds)
 */
function parseDuration(duration: string): number {
  const str = String(duration).trim();

  // Already in seconds
  if (/^\d+$/.test(str)) {
    return parseInt(str, 10);
  }

  // HH:MM:SS or MM:SS format
  const parts = str.split(":").map(Number);
  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }
  if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  }

  return 0;
}

/**
 * Parse SRT/VTT subtitle format to plain text
 */
function parseSubtitleToText(subtitle: string): string {
  // Remove VTT header
  let text = subtitle.replace(/^WEBVTT\s*/i, "");

  // Remove timestamps and cue numbers
  text = text
    // Remove SRT cue numbers (lines with just a number)
    .replace(/^\d+\s*$/gm, "")
    // Remove VTT/SRT timestamps
    .replace(/\d{1,2}:\d{2}:\d{2}[.,]\d{3}\s*-->\s*\d{1,2}:\d{2}:\d{2}[.,]\d{3}/g, "")
    // Remove VTT positioning info
    .replace(/^[A-Za-z]+:.*$/gm, "")
    // Remove speaker tags like <v Speaker Name>
    .replace(/<v\s+[^>]*>/gi, "")
    // Remove HTML-like tags
    .replace(/<[^>]+>/g, "")
    // Normalize whitespace
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return text;
}

/**
 * Validate if a URL is a valid podcast feed
 */
export async function validatePodcastFeed(
  url: string
): Promise<{ isValid: boolean; podcast?: ParsedPodcast; error?: DiscoveryError }> {
  const result = await fetchPodcastFeed(url, { maxEpisodes: 5 });

  if (result.error) {
    return { isValid: false, error: result.error };
  }

  // Check if it has audio enclosures (podcast indicator)
  const hasAudio = result.podcast?.episodes.some((ep) => ep.audioUrl);

  if (!hasAudio) {
    return {
      isValid: false,
      error: {
        code: "INVALID_FEED",
        message: "Feed does not contain audio enclosures",
        isRetryable: false,
      },
    };
  }

  return { isValid: true, podcast: result.podcast! };
}

/**
 * Get top/trending podcasts by genre
 */
export async function getTopPodcasts(
  genre?: string,
  options: { limit?: number; country?: string } = {}
): Promise<{ results: PodcastSearchResult[]; error?: DiscoveryError }> {
  const { limit = 20, country = "US" } = options;

  // Use iTunes top charts endpoint
  // Genre IDs: 26 = Podcasts, 1301 = Arts, 1303 = Comedy, 1304 = Education, etc.
  const genreId = genre ? getGenreId(genre) : "26";

  try {
    const url = `https://itunes.apple.com/${country.toLowerCase()}/rss/toppodcasts/limit=${limit}/genre=${genreId}/json`;

    const response = await fetch(url, {
      headers: {
        "User-Agent": "Rewind/1.0 (+https://rewind.app)",
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      return {
        results: [],
        error: {
          code: "NETWORK_ERROR",
          message: `iTunes API returned ${response.status}`,
          isRetryable: true,
        },
      };
    }

    const data = await response.json();
    const entries = data.feed?.entry || [];

    const results: PodcastSearchResult[] = entries.map((item: {
      id: { attributes: { "im:id": string } };
      "im:name": { label: string };
      "im:artist": { label: string };
      summary?: { label: string };
      "im:image": Array<{ label: string }>;
      category?: { attributes: { label: string } };
      "im:releaseDate"?: { label: string };
    }) => ({
      id: `itunes-${item.id?.attributes?.["im:id"]}`,
      itunesId: parseInt(item.id?.attributes?.["im:id"] || "0", 10),
      title: item["im:name"]?.label || "Unknown",
      author: item["im:artist"]?.label || "Unknown",
      description: item.summary?.label || "",
      artworkUrl: item["im:image"]?.[item["im:image"].length - 1]?.label || "",
      feedUrl: "", // Not provided in RSS feed, need to lookup
      genre: item.category?.attributes?.label || "Podcasts",
      trackCount: 0,
      releaseDate: item["im:releaseDate"]?.label,
      country,
      explicit: false,
    }));

    return { results };
  } catch (error) {
    console.error("[Podcast Discovery] Top podcasts error:", error);
    return {
      results: [],
      error: {
        code: "NETWORK_ERROR",
        message: error instanceof Error ? error.message : "Failed to fetch top podcasts",
        isRetryable: true,
      },
    };
  }
}

/**
 * Map genre name to iTunes genre ID
 */
function getGenreId(genre: string): string {
  const genreMap: Record<string, string> = {
    arts: "1301",
    business: "1321",
    comedy: "1303",
    education: "1304",
    fiction: "1483",
    health: "1512",
    history: "1487",
    news: "1489",
    science: "1533",
    society: "1324",
    sports: "1545",
    technology: "1318",
    truecrime: "1488",
    tv: "1309",
  };

  return genreMap[genre.toLowerCase()] || "26"; // Default to all podcasts
}
