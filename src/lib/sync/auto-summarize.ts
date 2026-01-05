import { createAdminClient } from "@/lib/supabase/admin";
import { summarize } from "@/lib/summarization/summarizer";

/**
 * Auto-summarize pending content items
 * Called after content sync to generate summaries for new items
 */
export async function autoSummarizePendingContent(options: {
  limit?: number;
  sourceId?: string;
} = {}): Promise<{
  processed: number;
  succeeded: number;
  failed: number;
  errors: string[];
}> {
  const { limit = 10, sourceId } = options;
  const supabase = createAdminClient();
  const errors: string[] = [];
  let processed = 0;
  let succeeded = 0;
  let failed = 0;

  // Get pending content items that need summarization
  let query = supabase
    .from("content_items")
    .select(`
      id,
      title,
      content_type,
      extracted_text,
      source_id
    `)
    .eq("processing_status", "pending")
    .not("extracted_text", "is", null)
    .order("published_at", { ascending: false })
    .limit(limit);

  if (sourceId) {
    query = query.eq("source_id", sourceId);
  }

  const { data: pendingItems, error: fetchError } = await query;

  if (fetchError) {
    console.error("[AutoSummarize] Error fetching pending items:", fetchError);
    return { processed: 0, succeeded: 0, failed: 0, errors: [fetchError.message] };
  }

  if (!pendingItems || pendingItems.length === 0) {
    console.log("[AutoSummarize] No pending items to summarize");
    return { processed: 0, succeeded: 0, failed: 0, errors: [] };
  }

  console.log(`[AutoSummarize] Processing ${pendingItems.length} items`);

  // Process items sequentially to avoid rate limits
  for (const item of pendingItems) {
    processed++;

    try {
      // Mark as processing
      await supabase
        .from("content_items")
        .update({ processing_status: "processing" })
        .eq("id", item.id);

      // Generate summary
      const startTime = Date.now();
      const summary = await summarize(item.extracted_text, {
        contentType: item.content_type as "article" | "podcast_episode" | "newsletter",
        title: item.title,
      });

      const processingTime = Date.now() - startTime;

      // Store summary
      const { error: insertError } = await supabase.from("summaries").insert({
        content_id: item.id,
        headline: summary.headline,
        tldr: summary.tldr,
        full_summary: summary.fullSummary,
        key_points: summary.keyPoints,
        key_takeaways: summary.keyTakeaways,
        related_ideas: summary.relatedIdeas,
        trivia: summary.trivia,
        podcast_speakers: summary.podcastSpeakers,
        quality_score: summary.qualityScore,
        processing_time_ms: processingTime,
        tokens_used: summary.tokensUsed || 0,
        model_used: process.env.OPENAI_MODEL || "gpt-4o",
      });

      if (insertError) {
        throw new Error(`Failed to save summary: ${insertError.message}`);
      }

      // Mark content as completed
      await supabase
        .from("content_items")
        .update({ processing_status: "completed" })
        .eq("id", item.id);

      succeeded++;
      console.log(`[AutoSummarize] Successfully summarized: ${item.title}`);
    } catch (error) {
      failed++;
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      errors.push(`${item.title}: ${errorMessage}`);

      // Mark as failed
      await supabase
        .from("content_items")
        .update({ processing_status: "failed" })
        .eq("id", item.id);

      console.error(`[AutoSummarize] Failed to summarize ${item.title}:`, error);
    }

    // Small delay between items to respect rate limits
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  return { processed, succeeded, failed, errors };
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
    .single();

  return !!data;
}
