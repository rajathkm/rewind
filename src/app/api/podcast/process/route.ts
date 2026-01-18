/**
 * Podcast Processing API
 *
 * Process podcast episodes: transcribe (if needed) and summarize
 *
 * POST /api/podcast/process
 * Body: { contentId: string, options?: { transcribeIfMissing, forceRetranscribe, forceSummarize } }
 *
 * POST /api/podcast/process/batch
 * Body: { contentIds: string[], options?: ProcessingOptions }
 */

import { NextRequest, NextResponse } from "next/server";
import { processPodcastEpisode, processPodcastBatch, getPendingPodcastEpisodes } from "@/lib/podcast";

// Environment check for CRON jobs
const CRON_SECRET = process.env.CRON_SECRET;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { contentId, contentIds, options = {} } = body;

    // Batch processing
    if (contentIds && Array.isArray(contentIds)) {
      console.log(`[Podcast API] Processing batch of ${contentIds.length} episodes`);

      const results = await processPodcastBatch(contentIds, options);

      const succeeded = results.filter((r) => r.success).length;
      const failed = results.filter((r) => !r.success).length;

      return NextResponse.json({
        success: true,
        processed: results.length,
        succeeded,
        failed,
        results,
      });
    }

    // Single episode processing
    if (contentId) {
      console.log(`[Podcast API] Processing episode: ${contentId}`);

      const result = await processPodcastEpisode(contentId, options);

      if (!result.success) {
        return NextResponse.json(
          {
            success: false,
            error: result.error,
            result,
          },
          { status: 422 }
        );
      }

      return NextResponse.json({
        success: true,
        result,
      });
    }

    return NextResponse.json(
      { error: "contentId or contentIds required" },
      { status: 400 }
    );
  } catch (error) {
    console.error("[Podcast API] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Processing failed" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/podcast/process?trigger=true&secret=<CRON_SECRET>
 *
 * Triggered by cron job to process pending podcast episodes
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const trigger = searchParams.get("trigger");
  const secret = searchParams.get("secret");
  const limit = parseInt(searchParams.get("limit") || "5", 10);
  const sourceId = searchParams.get("sourceId") || undefined;

  // Verify cron secret for automated processing
  if (trigger === "true") {
    if (!CRON_SECRET || secret !== CRON_SECRET) {
      return NextResponse.json(
        { error: "Invalid cron secret" },
        { status: 401 }
      );
    }

    console.log(`[Podcast API] Cron triggered processing (limit: ${limit})`);

    // Get pending episodes
    const pendingIds = await getPendingPodcastEpisodes({ limit, sourceId });

    if (pendingIds.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No pending episodes to process",
        processed: 0,
      });
    }

    // Process batch
    const results = await processPodcastBatch(pendingIds, {
      transcribeIfMissing: true,
    });

    const succeeded = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;

    return NextResponse.json({
      success: true,
      processed: results.length,
      succeeded,
      failed,
      results: results.map((r) => ({
        contentId: r.contentId,
        success: r.success,
        transcribed: r.transcribed,
        summarized: r.summarized,
        error: r.error,
      })),
    });
  }

  // Without trigger, just return status of pending episodes
  const pendingIds = await getPendingPodcastEpisodes({ limit: 100, sourceId });

  return NextResponse.json({
    pending: pendingIds.length,
    podcastIds: pendingIds.slice(0, 10), // Return first 10
  });
}
