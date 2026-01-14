import { NextRequest, NextResponse } from "next/server";
import { syncAllSources, syncSourceById } from "@/lib/sync/content-sync";
import { autoSummarizePendingContent } from "@/lib/sync/auto-summarize";

/**
 * POST /api/sync
 * Triggers content sync for all sources or a specific source
 *
 * Protected by CRON_SECRET for scheduled jobs
 * Can also be triggered with source_id for single source sync
 */
export async function POST(request: NextRequest) {
  try {
    // Verify authorization
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    // Check for cron secret in header (for Vercel Cron)
    if (authHeader !== `Bearer ${cronSecret}`) {
      // Also check query param for manual triggers during development
      const url = new URL(request.url);
      const secretParam = url.searchParams.get("secret");

      if (secretParam !== cronSecret) {
        return NextResponse.json(
          { error: "Unauthorized" },
          { status: 401 }
        );
      }
    }

    // Check if syncing a specific source
    const body = await request.json().catch(() => ({}));
    const sourceId = body.source_id;

    if (sourceId) {
      // Sync single source
      const result = await syncSourceById(sourceId);

      // Auto-summarize new content from this source
      let summarizeResult = null;
      if (result.success && result.itemsAdded > 0) {
        summarizeResult = await autoSummarizePendingContent({
          sourceId,
          limit: result.itemsAdded,
        });
      }

      return NextResponse.json({
        success: result.success,
        result,
        summarization: summarizeResult,
      });
    }

    // Sync all sources
    const summary = await syncAllSources();

    // Auto-summarize pending content (always run to process backlog)
    const summarizeResult = await autoSummarizePendingContent({
      limit: 10,
    });

    return NextResponse.json({
      success: true,
      summary,
      summarization: summarizeResult,
    });
  } catch (error) {
    console.error("[Sync API] Error:", error);
    return NextResponse.json(
      {
        error: "Sync failed",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/sync
 * Returns sync status and can trigger sync with secret
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const trigger = url.searchParams.get("trigger");
  const secret = url.searchParams.get("secret");
  const cronSecret = process.env.CRON_SECRET;

  // If trigger=true and secret matches, run sync
  if (trigger === "true" && secret === cronSecret) {
    const summary = await syncAllSources();

    // Auto-summarize pending content (always run to process backlog)
    const summarizeResult = await autoSummarizePendingContent({
      limit: 10,
    });

    return NextResponse.json({
      success: true,
      summary,
      summarization: summarizeResult,
    });
  }

  // Otherwise return status info
  return NextResponse.json({
    status: "ready",
    endpoint: "/api/sync",
    methods: ["POST", "GET"],
    usage: {
      post: "POST with Authorization: Bearer <CRON_SECRET>",
      get: "GET ?trigger=true&secret=<CRON_SECRET>",
    },
  });
}
