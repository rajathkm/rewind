import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Demo user ID for development without auth
const DEMO_USER_ID = "00000000-0000-0000-0000-000000000000";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // Use admin client and demo user for development
    const db = user ? supabase : createAdminClient();
    const userId = user?.id || DEMO_USER_ID;

    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");
    const sourceType = searchParams.get("sourceType") as
      | "newsletter"
      | "rss"
      | "podcast"
      | null;
    const unreadOnly = searchParams.get("unreadOnly") === "true";
    const savedOnly = searchParams.get("savedOnly") === "true";
    const sourceId = searchParams.get("sourceId");

    // Use the database function for efficient feed retrieval
    const { data: feedItems, error } = await db.rpc("get_user_feed", {
      p_user_id: userId,
      p_limit: limit,
      p_offset: offset,
      p_source_type: sourceType,
      p_unread_only: unreadOnly,
    });

    if (error) {
      // Fall back to direct query if function doesn't exist
      let query = db
        .from("content_items")
        .select(
          `
          *,
          content_sources!inner (
            id,
            source_type,
            title,
            image_url
          ),
          summaries (
            id
          ),
          user_content_state (
            is_read,
            is_saved,
            read_progress
          )
        `
        )
        .order("published_at", { ascending: false })
        .range(offset, offset + limit - 1);

      // Filter by user's subscriptions
      const { data: userSubs } = await db
        .from("subscriptions")
        .select("source_id")
        .eq("user_id", userId)
        .eq("status", "active");

      if (userSubs && userSubs.length > 0) {
        const sourceIds = userSubs.map((s) => s.source_id);
        query = query.in("source_id", sourceIds);
      }

      if (sourceType) {
        query = query.eq("content_sources.source_type", sourceType);
      }

      if (sourceId) {
        query = query.eq("source_id", sourceId);
      }

      const { data, error: queryError } = await query;

      if (queryError) {
        return NextResponse.json({ error: queryError.message }, { status: 500 });
      }

      // Transform the data
      const items = data?.map((item) => ({
        id: item.id,
        contentType: item.content_type,
        title: item.title,
        excerpt: item.excerpt,
        url: item.url,
        imageUrl: item.image_url,
        mediaUrl: item.media_url,
        publishedAt: item.published_at,
        durationSeconds: item.duration_seconds,
        readingTimeMinutes: item.reading_time_minutes,
        sourceId: item.source_id,
        sourceTitle: item.content_sources?.title,
        sourceType: item.content_sources?.source_type,
        sourceImageUrl: item.content_sources?.image_url,
        isRead: item.user_content_state?.[0]?.is_read || false,
        isSaved: item.user_content_state?.[0]?.is_saved || false,
        hasSummary: item.summaries && item.summaries.length > 0,
        playbackProgress: item.user_content_state?.[0]?.read_progress || 0,
      }));

      // Apply client-side filters for saved/unread if needed
      let filteredItems = items || [];
      if (unreadOnly) {
        filteredItems = filteredItems.filter((item) => !item.isRead);
      }
      if (savedOnly) {
        filteredItems = filteredItems.filter((item) => item.isSaved);
      }

      return NextResponse.json({
        items: filteredItems,
        hasMore: (items?.length || 0) === limit,
      });
    }

    // Transform RPC results
    const items = feedItems?.map((item: any) => ({
      id: item.content_id,
      contentType: item.source_type === "podcast" ? "episode" : "article",
      title: item.title,
      excerpt: item.excerpt,
      imageUrl: item.image_url,
      publishedAt: item.published_at,
      durationSeconds: item.duration_seconds,
      readingTimeMinutes: item.reading_time_minutes,
      sourceId: item.source_id,
      sourceTitle: item.source_title,
      sourceType: item.source_type,
      sourceImageUrl: item.source_image_url,
      isRead: item.is_read,
      isSaved: item.is_saved,
      hasSummary: item.has_summary,
    }));

    return NextResponse.json({
      items: items || [],
      hasMore: (feedItems?.length || 0) === limit,
    });
  } catch (error) {
    console.error("Error fetching content:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
