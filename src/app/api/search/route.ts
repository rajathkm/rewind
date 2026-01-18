import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Demo user ID for development without auth
const DEMO_USER_ID = "00000000-0000-0000-0000-000000000000";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const searchParams = request.nextUrl.searchParams;

    const query = searchParams.get("q") || "";
    const type = searchParams.get("type"); // 'article', 'podcast', 'all'
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const offset = parseInt(searchParams.get("offset") || "0", 10);

    if (!query || query.length < 2) {
      return NextResponse.json({
        results: [],
        total: 0,
        query: "",
        message: "Search query must be at least 2 characters"
      });
    }

    const { data: { user } } = await supabase.auth.getUser();
    const db = user ? supabase : createAdminClient();

    // Build search query using full-text search with pg_trgm fallback
    let searchQuery = db
      .from("content_items")
      .select(`
        id,
        title,
        excerpt,
        content_type,
        image_url,
        published_at,
        duration_seconds,
        reading_time_minutes,
        author,
        content_sources (
          id,
          title,
          source_type,
          image_url
        ),
        summaries (
          id,
          headline,
          tldr
        )
      `, { count: "exact" });

    // Apply full-text search on title
    // Use ilike for trigram search as fallback for partial matching
    searchQuery = searchQuery.or(
      `title.ilike.%${query}%,excerpt.ilike.%${query}%,content_text.ilike.%${query}%`
    );

    // Filter by content type if specified
    if (type && type !== "all") {
      if (type === "podcast") {
        searchQuery = searchQuery.eq("content_type", "episode");
      } else if (type === "article") {
        searchQuery = searchQuery.in("content_type", ["article", "newsletter_issue"]);
      }
    }

    // Order by relevance (most recent first for now)
    searchQuery = searchQuery
      .order("published_at", { ascending: false })
      .range(offset, offset + limit - 1);

    const { data: results, error, count } = await searchQuery;

    if (error) {
      console.error("Search error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Transform results
    const transformedResults = results?.map((item) => ({
      id: item.id,
      title: item.title,
      excerpt: item.excerpt,
      contentType: item.content_type,
      imageUrl: item.image_url,
      publishedAt: item.published_at,
      durationSeconds: item.duration_seconds,
      readingTimeMinutes: item.reading_time_minutes,
      author: item.author,
      source: item.content_sources,
      hasSummary: item.summaries && item.summaries.length > 0,
      summaryHeadline: item.summaries?.[0]?.headline || null,
    })) || [];

    return NextResponse.json({
      results: transformedResults,
      total: count || 0,
      query,
      limit,
      offset,
      hasMore: (count || 0) > offset + limit,
    });
  } catch (error) {
    console.error("Search error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
