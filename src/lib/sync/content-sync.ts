import Parser from "rss-parser";
import { createAdminClient } from "@/lib/supabase/admin";
import { extractFromHtml, extractFromText } from "@/lib/content/extractor";

function extractContent(content: string, type: "html" | "text") {
  if (type === "html") {
    return { text: extractFromHtml(content).content };
  }
  return { text: extractFromText(content).content };
}

// Custom feed item interface
interface CustomFeedItem {
  duration?: string;
  itunesImage?: { href?: string } | string;
  itunesAuthor?: string;
  itunesSummary?: string;
  contentEncoded?: string;
  mediaContent?: { url?: string };
}

// Custom feed interface
interface CustomFeed {
  itunesImage?: { href?: string } | string;
  itunesAuthor?: string;
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
      ["content:encoded", "contentEncoded"],
      ["media:content", "mediaContent"],
    ] as const,
    feed: [
      "itunesImage",
      "itunesAuthor",
    ],
  },
});

export interface SyncResult {
  sourceId: string;
  sourceName: string;
  success: boolean;
  itemsFound: number;
  itemsAdded: number;
  itemsUpdated: number;
  error?: string;
}

export interface SyncSummary {
  totalSources: number;
  successfulSources: number;
  failedSources: number;
  totalItemsAdded: number;
  totalItemsUpdated: number;
  results: SyncResult[];
  duration: number;
}

/**
 * Syncs content from all active sources
 */
export async function syncAllSources(): Promise<SyncSummary> {
  const startTime = Date.now();
  const supabase = createAdminClient();

  // Get all active sources
  const { data: sources, error: sourcesError } = await supabase
    .from("content_sources")
    .select("*")
    .eq("is_active", true)
    .in("source_type", ["rss", "podcast"])
    .order("last_fetched_at", { ascending: true, nullsFirst: true });

  if (sourcesError) {
    throw new Error(`Failed to fetch sources: ${sourcesError.message}`);
  }

  if (!sources || sources.length === 0) {
    return {
      totalSources: 0,
      successfulSources: 0,
      failedSources: 0,
      totalItemsAdded: 0,
      totalItemsUpdated: 0,
      results: [],
      duration: Date.now() - startTime,
    };
  }

  // Process sources in batches of 5 to avoid rate limiting
  const batchSize = 5;
  const results: SyncResult[] = [];

  for (let i = 0; i < sources.length; i += batchSize) {
    const batch = sources.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map((source) => syncSource(source, supabase))
    );
    results.push(...batchResults);
  }

  const summary: SyncSummary = {
    totalSources: sources.length,
    successfulSources: results.filter((r) => r.success).length,
    failedSources: results.filter((r) => !r.success).length,
    totalItemsAdded: results.reduce((sum, r) => sum + r.itemsAdded, 0),
    totalItemsUpdated: results.reduce((sum, r) => sum + r.itemsUpdated, 0),
    results,
    duration: Date.now() - startTime,
  };

  return summary;
}

/**
 * Syncs content from a single source
 */
export async function syncSource(
  source: {
    id: string;
    title: string;
    feed_url: string | null;
    source_type: string;
    fetch_error_count: number;
  },
  supabase?: ReturnType<typeof createAdminClient>
): Promise<SyncResult> {
  const client = supabase || createAdminClient();
  const result: SyncResult = {
    sourceId: source.id,
    sourceName: source.title,
    success: false,
    itemsFound: 0,
    itemsAdded: 0,
    itemsUpdated: 0,
  };

  if (!source.feed_url) {
    result.error = "No feed URL configured";
    await updateSourceError(client, source.id, result.error, source.fetch_error_count);
    return result;
  }

  try {
    // Fetch and parse the feed
    const feed = await parser.parseURL(source.feed_url);
    result.itemsFound = feed.items?.length || 0;

    if (!feed.items || feed.items.length === 0) {
      result.success = true;
      await updateSourceSuccess(client, source.id);
      return result;
    }

    // Process each item
    for (const item of feed.items) {
      const contentItem = await processItem(item, source, client);
      if (contentItem.isNew) {
        result.itemsAdded++;
      } else if (contentItem.isUpdated) {
        result.itemsUpdated++;
      }
    }

    result.success = true;
    await updateSourceSuccess(client, source.id);
  } catch (error) {
    result.error = error instanceof Error ? error.message : "Unknown error";
    await updateSourceError(client, source.id, result.error, source.fetch_error_count);
  }

  return result;
}

/**
 * Syncs a single source by ID
 */
export async function syncSourceById(sourceId: string): Promise<SyncResult> {
  const supabase = createAdminClient();

  const { data: source, error } = await supabase
    .from("content_sources")
    .select("*")
    .eq("id", sourceId)
    .single();

  if (error || !source) {
    return {
      sourceId,
      sourceName: "Unknown",
      success: false,
      itemsFound: 0,
      itemsAdded: 0,
      itemsUpdated: 0,
      error: error?.message || "Source not found",
    };
  }

  return syncSource(source, supabase);
}

interface ProcessedItem {
  isNew: boolean;
  isUpdated: boolean;
  id?: string;
}

type ExtendedItem = Parser.Item & CustomFeedItem;

async function processItem(
  item: ExtendedItem,
  source: { id: string; source_type: string },
  supabase: ReturnType<typeof createAdminClient>
): Promise<ProcessedItem> {
  // Generate a unique external ID from guid or link
  const externalId = item.guid || item.link || `${source.id}-${item.title}`;

  // Check if item already exists
  const { data: existing } = await supabase
    .from("content_items")
    .select("id, content_hash")
    .eq("external_id", externalId)
    .single();

  // Determine content type
  const contentType = determineContentType(item, source.source_type);

  // Extract content
  const rawContent = item.contentEncoded || item.content || item.contentSnippet || "";
  const extractedContent = extractContent(rawContent, "html");

  // Calculate content hash for change detection
  const contentHash = hashContent(extractedContent.text);

  // Parse audio info for podcasts
  const audioInfo = parseAudioInfo(item);

  // Build the content item record
  const contentRecord = {
    source_id: source.id,
    external_id: externalId,
    content_type: contentType,
    title: item.title || "Untitled",
    author: item.creator || item.itunesAuthor || null,
    url: item.link || null,
    image_url: extractImageUrl(item),
    published_at: item.pubDate ? new Date(item.pubDate).toISOString() : null,
    raw_content: rawContent,
    extracted_text: extractedContent.text,
    content_hash: contentHash,
    word_count: extractedContent.text.split(/\s+/).filter(Boolean).length,
    audio_url: audioInfo?.url || null,
    audio_duration_seconds: audioInfo?.duration || null,
    audio_file_size: audioInfo?.fileSize || null,
    processing_status: "pending" as const,
    metadata: {
      categories: item.categories || [],
      enclosure: item.enclosure || null,
    },
  };

  if (existing) {
    // Check if content has changed
    if (existing.content_hash !== contentHash) {
      await supabase
        .from("content_items")
        .update({
          ...contentRecord,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id);

      return { isNew: false, isUpdated: true, id: existing.id };
    }
    return { isNew: false, isUpdated: false, id: existing.id };
  }

  // Insert new item
  const { data: newItem, error } = await supabase
    .from("content_items")
    .insert(contentRecord)
    .select("id")
    .single();

  if (error) {
    console.error(`Failed to insert item: ${error.message}`);
    return { isNew: false, isUpdated: false };
  }

  return { isNew: true, isUpdated: false, id: newItem?.id };
}

function determineContentType(
  item: ExtendedItem,
  sourceType: string
): "article" | "podcast_episode" | "newsletter" {
  // Check for audio enclosure (podcast)
  if (
    sourceType === "podcast" ||
    (item.enclosure?.type?.startsWith("audio/")) ||
    item.enclosure?.url?.match(/\.(mp3|m4a|wav|ogg)$/i)
  ) {
    return "podcast_episode";
  }
  return "article";
}

function parseAudioInfo(
  item: ExtendedItem
): { url: string; duration?: number; fileSize?: number } | null {
  const enclosure = item.enclosure;
  if (!enclosure?.url) return null;

  // Check if it's audio
  if (
    !enclosure.type?.startsWith("audio/") &&
    !enclosure.url.match(/\.(mp3|m4a|wav|ogg)$/i)
  ) {
    return null;
  }

  // Parse duration (can be in various formats: seconds, HH:MM:SS, MM:SS)
  let duration: number | undefined;
  if (item.duration) {
    const durationStr = String(item.duration);
    if (durationStr.includes(":")) {
      const parts = durationStr.split(":").map(Number);
      if (parts.length === 3) {
        duration = parts[0] * 3600 + parts[1] * 60 + parts[2];
      } else if (parts.length === 2) {
        duration = parts[0] * 60 + parts[1];
      }
    } else {
      duration = parseInt(durationStr, 10);
    }
  }

  return {
    url: enclosure.url,
    duration,
    fileSize: enclosure.length ? parseInt(String(enclosure.length), 10) : undefined,
  };
}

function extractImageUrl(item: ExtendedItem): string | null {
  // Try various image sources
  if (item.itunesImage) {
    if (typeof item.itunesImage === "string") return item.itunesImage;
    if (item.itunesImage.href) return item.itunesImage.href;
  }
  if (item.mediaContent?.url) return item.mediaContent.url;

  // Try to extract from content
  const imgMatch = (item.content || "").match(/<img[^>]+src=["']([^"']+)["']/i);
  if (imgMatch) return imgMatch[1];

  return null;
}

function hashContent(content: string): string {
  // Simple hash for change detection
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return hash.toString(36);
}

async function updateSourceSuccess(
  supabase: ReturnType<typeof createAdminClient>,
  sourceId: string
) {
  await supabase
    .from("content_sources")
    .update({
      last_fetched_at: new Date().toISOString(),
      fetch_error_count: 0,
      last_error_message: null,
    })
    .eq("id", sourceId);
}

async function updateSourceError(
  supabase: ReturnType<typeof createAdminClient>,
  sourceId: string,
  errorMessage: string,
  currentErrorCount: number
) {
  await supabase
    .from("content_sources")
    .update({
      fetch_error_count: currentErrorCount + 1,
      last_error_message: errorMessage,
      // Deactivate after 5 consecutive errors
      is_active: currentErrorCount + 1 < 5,
    })
    .eq("id", sourceId);
}
