/**
 * Podcast Processing Service
 *
 * Handles the complete podcast episode processing pipeline:
 * 1. Fetch episode metadata and existing transcript (if available)
 * 2. Transcribe audio via Whisper if no transcript
 * 3. Summarize the transcript
 *
 * This service bridges the gap between raw podcast feeds and
 * summarized, searchable content.
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { summarizeContent } from "@/lib/summarization/summarizer";
import { transcribeAudioFromUrl, estimateTranscriptionCost } from "./transcription";
import { fetchEpisodeTranscript } from "./discovery";
import { MIN_WORDS_FOR_PODCAST_SUMMARY } from "@/lib/content/config";

// ============================================================================
// Types
// ============================================================================

export interface ProcessingResult {
  success: boolean;
  contentId: string;
  transcribed: boolean;
  summarized: boolean;
  transcriptionSource?: "existing" | "podcast_namespace" | "whisper";
  wordCount?: number;
  transcriptionCost?: number;
  summarizationCost?: number;
  error?: string;
}

export interface ProcessingOptions {
  transcribeIfMissing?: boolean; // Default: true - transcribe with Whisper if no transcript
  forceRetranscribe?: boolean; // Default: false - re-transcribe even if text exists
  forceSummarize?: boolean; // Default: false - re-summarize even if summary exists
  maxAudioDurationSeconds?: number; // Default: 7200 (2 hours) - skip longer episodes
}

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_OPTIONS: ProcessingOptions = {
  transcribeIfMissing: true,
  forceRetranscribe: false,
  forceSummarize: false,
  maxAudioDurationSeconds: 7200, // 2 hours
};

// ============================================================================
// Main Processing Function
// ============================================================================

/**
 * Process a podcast episode: transcribe (if needed) and summarize
 */
export async function processPodcastEpisode(
  contentId: string,
  options: ProcessingOptions = {}
): Promise<ProcessingResult> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const supabase = createAdminClient();

  const result: ProcessingResult = {
    success: false,
    contentId,
    transcribed: false,
    summarized: false,
  };

  try {
    // Fetch the content item
    const { data: item, error: fetchError } = await supabase
      .from("content_items")
      .select(`
        id,
        title,
        content_type,
        extracted_text,
        word_count,
        audio_url,
        audio_duration_seconds,
        processing_status,
        metadata
      `)
      .eq("id", contentId)
      .single();

    if (fetchError || !item) {
      result.error = "Content item not found";
      return result;
    }

    if (item.content_type !== "episode") {
      result.error = "Content is not a podcast episode";
      return result;
    }

    console.log(`[PodcastProcessor] Processing: ${item.title}`);

    // Mark as processing
    await supabase
      .from("content_items")
      .update({ processing_status: "processing" })
      .eq("id", contentId);

    // =========================================================================
    // Step 1: Get or create transcript
    // =========================================================================

    let transcript = item.extracted_text || "";
    let transcriptionSource: ProcessingResult["transcriptionSource"];
    let transcriptionCost = 0;

    // Check if we need to get/create a transcript
    const currentWordCount = countWords(transcript);
    const needsTranscript = opts.forceRetranscribe || currentWordCount < MIN_WORDS_FOR_PODCAST_SUMMARY;

    if (needsTranscript) {
      console.log(`[PodcastProcessor] Need transcript: current ${currentWordCount} words, min ${MIN_WORDS_FOR_PODCAST_SUMMARY}`);

      // Try to fetch existing transcript from Podcast 2.0 namespace
      const transcriptUrl = item.metadata?.transcriptUrl;
      if (transcriptUrl && !opts.forceRetranscribe) {
        console.log(`[PodcastProcessor] Trying Podcast 2.0 transcript: ${transcriptUrl}`);
        const { transcript: existingTranscript, error } = await fetchEpisodeTranscript(transcriptUrl);

        if (existingTranscript && !error) {
          transcript = existingTranscript;
          transcriptionSource = "podcast_namespace";
          result.transcribed = true;
          console.log(`[PodcastProcessor] Found Podcast 2.0 transcript: ${countWords(transcript)} words`);
        }
      }

      // If still no transcript and we have audio URL, transcribe with Whisper
      if (countWords(transcript) < MIN_WORDS_FOR_PODCAST_SUMMARY && item.audio_url && opts.transcribeIfMissing) {
        // Check duration limit
        const duration = item.audio_duration_seconds || 0;
        if (duration > opts.maxAudioDurationSeconds!) {
          console.log(`[PodcastProcessor] Episode too long: ${duration}s > ${opts.maxAudioDurationSeconds}s`);
          result.error = `Episode duration (${Math.round(duration / 60)} min) exceeds limit`;
          await updateProcessingStatus(supabase, contentId, "skipped");
          return result;
        }

        // Estimate cost before transcribing
        const estimatedCost = estimateTranscriptionCost(duration);
        console.log(`[PodcastProcessor] Transcribing with Whisper (estimated cost: $${estimatedCost.toFixed(4)})`);

        const { result: transcriptionResult, error: transcriptionError } = await transcribeAudioFromUrl(
          item.audio_url,
          { language: "en" }
        );

        if (transcriptionError) {
          console.error(`[PodcastProcessor] Transcription failed: ${transcriptionError.message}`);

          // If transcription fails but we have some text, continue with what we have
          if (currentWordCount >= 50) {
            console.log(`[PodcastProcessor] Continuing with existing text (${currentWordCount} words)`);
          } else {
            result.error = `Transcription failed: ${transcriptionError.message}`;
            await updateProcessingStatus(supabase, contentId, "failed");
            return result;
          }
        } else if (transcriptionResult) {
          transcript = transcriptionResult.text;
          transcriptionSource = "whisper";
          transcriptionCost = transcriptionResult.cost;
          result.transcribed = true;
          result.transcriptionCost = transcriptionCost;
          console.log(`[PodcastProcessor] Whisper transcription complete: ${countWords(transcript)} words`);
        }
      }

      // Update the content item with transcript
      if (result.transcribed && transcript !== item.extracted_text) {
        const newWordCount = countWords(transcript);
        await supabase
          .from("content_items")
          .update({
            extracted_text: transcript,
            word_count: newWordCount,
            content_source: transcriptionSource,
            is_summarizable: newWordCount >= MIN_WORDS_FOR_PODCAST_SUMMARY,
          })
          .eq("id", contentId);
      }
    } else {
      transcriptionSource = "existing";
      console.log(`[PodcastProcessor] Using existing transcript: ${currentWordCount} words`);
    }

    // =========================================================================
    // Step 2: Summarize
    // =========================================================================

    const finalWordCount = countWords(transcript);
    result.wordCount = finalWordCount;

    if (finalWordCount < MIN_WORDS_FOR_PODCAST_SUMMARY) {
      console.log(`[PodcastProcessor] Insufficient content for summary: ${finalWordCount} words`);
      result.error = `Insufficient content: ${finalWordCount} words (need ${MIN_WORDS_FOR_PODCAST_SUMMARY})`;
      await updateProcessingStatus(supabase, contentId, "skipped");
      return result;
    }

    // Check if summary already exists (unless forcing)
    if (!opts.forceSummarize) {
      const { data: existingSummary } = await supabase
        .from("summaries")
        .select("id")
        .eq("content_id", contentId)
        .maybeSingle();

      if (existingSummary) {
        console.log(`[PodcastProcessor] Summary already exists, skipping`);
        result.summarized = true;
        result.success = true;
        await updateProcessingStatus(supabase, contentId, "completed");
        return result;
      }
    }

    // Generate summary
    console.log(`[PodcastProcessor] Generating summary for ${finalWordCount} words`);
    const summaryResult = await summarizeContent(transcript, {
      contentType: "podcast",
      title: item.title,
      duration: item.audio_duration_seconds,
    });

    result.summarizationCost = summaryResult.cost;

    // Store summary
    const { error: upsertError } = await supabase
      .from("summaries")
      .upsert({
        content_id: contentId,
        headline: summaryResult.summary.headline,
        tldr: summaryResult.summary.tldr,
        full_summary: summaryResult.summary.fullSummary,
        key_points: summaryResult.summary.keyPoints,
        key_takeaways: summaryResult.summary.keyTakeaways,
        related_ideas: summaryResult.summary.relatedIdeas,
        allied_trivia: summaryResult.summary.alliedTrivia,
        processing_time_ms: summaryResult.processingTimeMs,
        tokens_used: summaryResult.tokensUsed,
        model_used: process.env.OPENAI_MODEL || "gpt-4o",
      }, {
        onConflict: "content_id,summary_type",
      });

    if (upsertError) {
      throw new Error(`Failed to save summary: ${upsertError.message}`);
    }

    result.summarized = true;
    result.success = true;
    result.transcriptionSource = transcriptionSource;

    await updateProcessingStatus(supabase, contentId, "completed");

    console.log(`[PodcastProcessor] Complete: transcribed=${result.transcribed}, summarized=${result.summarized}`);

    return result;
  } catch (error) {
    console.error(`[PodcastProcessor] Error:`, error);
    result.error = error instanceof Error ? error.message : "Unknown error";

    const supabase = createAdminClient();
    await updateProcessingStatus(supabase, contentId, "failed");

    return result;
  }
}

/**
 * Process multiple podcast episodes in batch
 */
export async function processPodcastBatch(
  contentIds: string[],
  options: ProcessingOptions = {}
): Promise<ProcessingResult[]> {
  const results: ProcessingResult[] = [];

  // Process sequentially to avoid overwhelming APIs
  for (const contentId of contentIds) {
    const result = await processPodcastEpisode(contentId, options);
    results.push(result);

    // Small delay between episodes
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  return results;
}

/**
 * Get pending podcast episodes that need processing
 */
export async function getPendingPodcastEpisodes(
  options: { limit?: number; sourceId?: string } = {}
): Promise<string[]> {
  const { limit = 10, sourceId } = options;
  const supabase = createAdminClient();

  let query = supabase
    .from("content_items")
    .select("id")
    .eq("content_type", "episode")
    .in("processing_status", ["pending", "failed"])
    .order("published_at", { ascending: false })
    .limit(limit);

  if (sourceId) {
    query = query.eq("source_id", sourceId);
  }

  const { data, error } = await query;

  if (error) {
    console.error("[PodcastProcessor] Error fetching pending episodes:", error);
    return [];
  }

  return (data || []).map((item) => item.id);
}

// ============================================================================
// Utility Functions
// ============================================================================

function countWords(text: string): number {
  return text.split(/\s+/).filter((word) => word.length > 0).length;
}

async function updateProcessingStatus(
  supabase: ReturnType<typeof createAdminClient>,
  contentId: string,
  status: string
): Promise<void> {
  await supabase
    .from("content_items")
    .update({ processing_status: status })
    .eq("id", contentId);
}
