/**
 * Podcast Search API
 *
 * Search for podcasts using iTunes Search API
 *
 * GET /api/podcast/search?q=<query>&limit=20&country=US
 */

import { NextRequest, NextResponse } from "next/server";
import { searchPodcasts, getTopPodcasts } from "@/lib/podcast";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get("q");
  const limit = parseInt(searchParams.get("limit") || "20", 10);
  const country = searchParams.get("country") || "US";
  const genre = searchParams.get("genre");

  // If no query, return top podcasts
  if (!query) {
    const { results, error } = await getTopPodcasts(genre || undefined, {
      limit,
      country,
    });

    if (error) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.isRetryable ? 503 : 400 }
      );
    }

    return NextResponse.json({
      results,
      count: results.length,
      type: "top",
    });
  }

  // Search podcasts
  const { results, error } = await searchPodcasts(query, {
    limit,
    country,
  });

  if (error) {
    return NextResponse.json(
      { error: error.message, code: error.code },
      { status: error.isRetryable ? 503 : 400 }
    );
  }

  return NextResponse.json({
    results,
    count: results.length,
    query,
    type: "search",
  });
}
