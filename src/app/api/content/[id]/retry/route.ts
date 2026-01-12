import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { retrySummarization } from "@/lib/sync/auto-summarize";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { id } = await params;

    // In development mode, skip auth check for easier testing
    const isDev = process.env.NODE_ENV === "development";

    if (!isDev) {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    // Verify the content item exists
    const { data: contentItem, error: fetchError } = await supabase
      .from("content_items")
      .select("id, title, processing_status")
      .eq("id", id)
      .single();

    if (fetchError || !contentItem) {
      return NextResponse.json({ error: "Content not found" }, { status: 404 });
    }

    // Only allow retry for failed or permanently_failed items
    if (!["failed", "permanently_failed", "skipped"].includes(contentItem.processing_status)) {
      return NextResponse.json(
        { error: `Cannot retry content with status: ${contentItem.processing_status}` },
        { status: 400 }
      );
    }

    // Trigger the retry
    const result = await retrySummarization(id);

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: `Successfully summarized: ${contentItem.title}`,
      });
    } else {
      return NextResponse.json(
        { error: result.error || "Failed to summarize content" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error retrying summarization:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
