import { NextRequest, NextResponse } from "next/server";
import { autoSummarizePendingContent } from "@/lib/sync/auto-summarize";

/**
 * POST /api/summarize
 * Triggers auto-summarization for pending content items
 *
 * Protected by CRON_SECRET
 */
export async function POST(request: NextRequest) {
  try {
    // Verify authorization
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (authHeader !== `Bearer ${cronSecret}`) {
      const url = new URL(request.url);
      const secretParam = url.searchParams.get("secret");

      if (secretParam !== cronSecret) {
        return NextResponse.json(
          { error: "Unauthorized" },
          { status: 401 }
        );
      }
    }

    const body = await request.json().catch(() => ({}));
    const { limit = 10, sourceId } = body;

    console.log(`[Summarize API] Starting summarization with limit=${limit}, sourceId=${sourceId || 'all'}`);
    console.log(`[Summarize API] OPENAI_API_KEY is ${process.env.OPENAI_API_KEY ? 'SET' : 'NOT SET'}`);

    const result = await autoSummarizePendingContent({ limit, sourceId });

    console.log(`[Summarize API] Result:`, JSON.stringify(result, null, 2));

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error("[Summarize API] Error:", error);
    return NextResponse.json(
      {
        error: "Summarization failed",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/summarize
 * Returns summarization status
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const trigger = url.searchParams.get("trigger");
  const secret = url.searchParams.get("secret");
  const cronSecret = process.env.CRON_SECRET;

  // If trigger=true and secret matches, run summarization
  if (trigger === "true" && secret === cronSecret) {
    const limit = parseInt(url.searchParams.get("limit") || "10", 10);
    console.log(`[Summarize API] GET trigger with limit=${limit}`);
    console.log(`[Summarize API] OPENAI_API_KEY is ${process.env.OPENAI_API_KEY ? 'SET' : 'NOT SET'}`);

    const result = await autoSummarizePendingContent({ limit });

    console.log(`[Summarize API] Result:`, JSON.stringify(result, null, 2));

    return NextResponse.json({
      success: true,
      ...result,
    });
  }

  return NextResponse.json({
    status: "ready",
    endpoint: "/api/summarize",
    methods: ["POST", "GET"],
    usage: {
      post: "POST with Authorization: Bearer <CRON_SECRET> and optional { limit, sourceId }",
      get: "GET ?trigger=true&secret=<CRON_SECRET>&limit=10",
    },
  });
}
