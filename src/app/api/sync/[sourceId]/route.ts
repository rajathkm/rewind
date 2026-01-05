import { NextRequest, NextResponse } from "next/server";
import { syncSourceById } from "@/lib/sync/content-sync";

/**
 * POST /api/sync/[sourceId]
 * Triggers content sync for a specific source
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ sourceId: string }> }
) {
  try {
    const { sourceId } = await params;

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

    const result = await syncSourceById(sourceId);

    return NextResponse.json({
      success: result.success,
      result,
    });
  } catch (error) {
    console.error("[Sync Source API] Error:", error);
    return NextResponse.json(
      {
        error: "Sync failed",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
