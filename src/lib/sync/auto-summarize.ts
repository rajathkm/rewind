import { createAdminClient } from "@/lib/supabase/admin";
import { summarizeContent } from "@/lib/summarization/summarizer";
import { MIN_WORDS_FOR_SUMMARY } from "@/lib/content/config";

// Retry configuration
const MAX_RETRIES = 3;
const RETRY_DELAYS_MS = [
  5 * 60 * 1000,    // 5 minutes
  30 * 60 * 1000,   // 30 minutes
  2 * 60 * 60 * 1000, // 2 hours
];

interface ContentItem {
  id: string;
  title: string;
  content_type: string;
  extracted_text: string;
  source_id: string;
  word_count: number | null;
  retry_count: number;
  last_retry_at: string | null;
  processing_status: string;
}

/**
 * Auto-summarize pending content items
 * Called after content sync to generate summaries for new items
 * Includes retry logic for failed items and respects subscription settings
 */
export async function autoSummarizePendingContent(options: {
  limit?: number;
  sourceId?: string;
  includeRetries?: boolean;
} = {}): Promise<{
  processed: number;
  succeeded: number;
  failed: number;
  skipped: number;
  errors: string[];
}> {
  const { limit = 10, sourceId, includeRetries = true } = options;
  const supabase = createAdminClient();
  const errors: string[] = [];
  let processed = 0;
  let succeeded = 0;
  let failed = 0;
  let skipped = 0;

  // Get content items that need summarization:
  // 1. Pending items with auto_summarize enabled on their subscription
  // 2. Failed items that can be retried (retry_count < MAX_RETRIES and backoff elapsed)
  const { data: pendingItems, error: fetchError } = await supabase
    .from("content_items")
    .select(`
      id,
      title,
      content_type,
      extracted_text,
      source_id,
      word_count,
      retry_count,
      last_retry_at,
      processing_status
    `)
    .or(`processing_status.eq.pending${includeRetries ? ',processing_status.eq.failed' : ''}`)
    .not("extracted_text", "is", null)
    .gte("word_count", MIN_WORDS_FOR_SUMMARY)
    .order("published_at", { ascending: false })
    .limit(limit * 2); // Fetch more to account for filtering

  if (fetchError) {
    console.error("[AutoSummarize] Error fetching items:", fetchError);
    return { processed: 0, succeeded: 0, failed: 0, skipped: 0, errors: [fetchError.message] };
  }

  if (!pendingItems || pendingItems.length === 0) {
    console.log("[AutoSummarize] No items to summarize");
    return { processed: 0, succeeded: 0, failed: 0, skipped: 0, errors: [] };
  }

  // Filter items based on:
  // 1. Source filter if provided
  // 2. Subscription auto_summarize setting
  // 3. Retry backoff for failed items
  const itemsToProcess: ContentItem[] = [];

  for (const item of pendingItems as ContentItem[]) {
    // Apply source filter
    if (sourceId && item.source_id !== sourceId) {
      continue;
    }

    // Check if auto_summarize is enabled for this source's subscriptions
    const { data: subscription } = await supabase
      .from("subscriptions")
      .select("auto_summarize")
      .eq("source_id", item.source_id)
      .eq("auto_summarize", true)
      .limit(1)
      .maybeSingle();

    if (!subscription) {
      console.log(`[AutoSummarize] Skipping ${item.title}: auto_summarize disabled`);
      skipped++;
      continue;
    }

    // For failed items, check retry eligibility
    if (item.processing_status === "failed") {
      if (item.retry_count >= MAX_RETRIES) {
        // Mark as permanently failed
        await supabase
          .from("content_items")
          .update({ processing_status: "permanently_failed" })
          .eq("id", item.id);
        console.log(`[AutoSummarize] ${item.title}: Max retries reached, marking permanently failed`);
        continue;
      }

      // Check backoff period
      if (item.last_retry_at) {
        const lastRetry = new Date(item.last_retry_at).getTime();
        const backoffMs = RETRY_DELAYS_MS[item.retry_count] || RETRY_DELAYS_MS[RETRY_DELAYS_MS.length - 1];
        const nextRetryTime = lastRetry + backoffMs;

        if (Date.now() < nextRetryTime) {
          console.log(`[AutoSummarize] ${item.title}: Backoff not elapsed, skipping retry`);
          continue;
        }
      }
    }

    itemsToProcess.push(item);

    if (itemsToProcess.length >= limit) {
      break;
    }
  }

  if (itemsToProcess.length === 0) {
    console.log("[AutoSummarize] No eligible items to summarize after filtering");
    return { processed: 0, succeeded: 0, failed: 0, skipped, errors: [] };
  }

  console.log(`[AutoSummarize] Processing ${itemsToProcess.length} items`);

  // Process items sequentially to avoid rate limits
  for (const item of itemsToProcess) {
    processed++;
    const isRetry = item.processing_status === "failed";

    try {
      // Mark as processing
      await supabase
        .from("content_items")
        .update({ processing_status: "processing" })
        .eq("id", item.id);

      // Generate summary
      const contentType = item.content_type === "podcast_episode" ? "podcast" : "article";
      const result = await summarizeContent(item.extracted_text, {
        contentType,
        title: item.title,
      });

      // Store summary (upsert to handle retries)
      const { error: upsertError } = await supabase
        .from("summaries")
        .upsert({
          content_id: item.id,
          headline: result.summary.headline,
          tldr: result.summary.tldr,
          full_summary: result.summary.fullSummary,
          key_points: result.summary.keyPoints,
          key_takeaways: result.summary.keyTakeaways,
          related_ideas: result.summary.relatedIdeas,
          allied_trivia: result.summary.alliedTrivia,
          processing_time_ms: result.processingTimeMs,
          tokens_used: result.tokensUsed,
          model_used: process.env.OPENAI_MODEL || "gpt-4o",
        }, {
          onConflict: "content_id,summary_type",
        });

      if (upsertError) {
        throw new Error(`Failed to save summary: ${upsertError.message}`);
      }

      // Mark content as completed and reset retry count
      await supabase
        .from("content_items")
        .update({
          processing_status: "completed",
          retry_count: 0,
          last_retry_at: null,
        })
        .eq("id", item.id);

      succeeded++;
      console.log(`[AutoSummarize] Successfully summarized${isRetry ? " (retry)" : ""}: ${item.title}`);
    } catch (error) {
      failed++;
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      errors.push(`${item.title}: ${errorMessage}`);

      // Update retry count and mark as failed
      const newRetryCount = (item.retry_count || 0) + 1;
      const newStatus = newRetryCount >= MAX_RETRIES ? "permanently_failed" : "failed";

      await supabase
        .from("content_items")
        .update({
          processing_status: newStatus,
          retry_count: newRetryCount,
          last_retry_at: new Date().toISOString(),
        })
        .eq("id", item.id);

      console.error(
        `[AutoSummarize] Failed to summarize ${item.title} (attempt ${newRetryCount}/${MAX_RETRIES}):`,
        error
      );
    }

    // Small delay between items to respect rate limits
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  return { processed, succeeded, failed, skipped, errors };
}

/**
 * Check if auto-summarization is enabled for a source
 */
export async function isAutoSummarizeEnabled(sourceId: string): Promise<boolean> {
  const supabase = createAdminClient();

  const { data } = await supabase
    .from("subscriptions")
    .select("auto_summarize")
    .eq("source_id", sourceId)
    .eq("auto_summarize", true)
    .limit(1)
    .maybeSingle();

  return !!data;
}

/**
 * Manually retry summarization for a specific content item
 * Resets retry count and attempts immediately
 */
export async function retrySummarization(contentId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  const supabase = createAdminClient();

  // Get the content item
  const { data: item, error: fetchError } = await supabase
    .from("content_items")
    .select("id, title, content_type, extracted_text, word_count")
    .eq("id", contentId)
    .single();

  if (fetchError || !item) {
    return { success: false, error: "Content not found" };
  }

  if (!item.extracted_text || (item.word_count || 0) < MIN_WORDS_FOR_SUMMARY) {
    return { success: false, error: "Content too short for summarization" };
  }

  try {
    // Reset retry count and mark as processing
    await supabase
      .from("content_items")
      .update({
        processing_status: "processing",
        retry_count: 0,
        last_retry_at: null,
      })
      .eq("id", contentId);

    // Generate summary
    const contentType = item.content_type === "podcast_episode" ? "podcast" : "article";
    const result = await summarizeContent(item.extracted_text, {
      contentType,
      title: item.title,
    });

    // Store summary (upsert)
    const { error: upsertError } = await supabase
      .from("summaries")
      .upsert({
        content_id: item.id,
        headline: result.summary.headline,
        tldr: result.summary.tldr,
        full_summary: result.summary.fullSummary,
        key_points: result.summary.keyPoints,
        key_takeaways: result.summary.keyTakeaways,
        related_ideas: result.summary.relatedIdeas,
        allied_trivia: result.summary.alliedTrivia,
        processing_time_ms: result.processingTimeMs,
        tokens_used: result.tokensUsed,
        model_used: process.env.OPENAI_MODEL || "gpt-4o",
      }, {
        onConflict: "content_id,summary_type",
      });

    if (upsertError) {
      throw new Error(upsertError.message);
    }

    // Mark as completed
    await supabase
      .from("content_items")
      .update({ processing_status: "completed" })
      .eq("id", contentId);

    return { success: true };
  } catch (error) {
    // Mark as failed
    await supabase
      .from("content_items")
      .update({
        processing_status: "failed",
        retry_count: 1,
        last_retry_at: new Date().toISOString(),
      })
      .eq("id", contentId);

    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
