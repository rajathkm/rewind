/**
 * Podcast Details API
 *
 * GET /api/podcast/:id - Get podcast details by iTunes ID
 */

import { NextRequest, NextResponse } from "next/server";
import { getPodcastByItunesId, fetchPodcastFeed } from "@/lib/podcast";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, context: RouteParams) {
  const { id } = await context.params;

  // Check if this is an iTunes ID (numeric) or feed URL
  const isItunesId = /^\d+$/.test(id);

  if (isItunesId) {
    const itunesId = parseInt(id, 10);
    console.log(`[Podcast API] Fetching podcast by iTunes ID: ${itunesId}`);

    const { podcast, error } = await getPodcastByItunesId(itunesId);

    if (error) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.code === "NOT_FOUND" ? 404 : 500 }
      );
    }

    return NextResponse.json({ podcast });
  }

  // Treat as feed URL (base64 encoded)
  try {
    const feedUrl = Buffer.from(id, "base64").toString("utf-8");
    console.log(`[Podcast API] Fetching podcast by feed URL: ${feedUrl}`);

    const maxEpisodes = parseInt(request.nextUrl.searchParams.get("episodes") || "50", 10);

    const { podcast, error } = await fetchPodcastFeed(feedUrl, { maxEpisodes });

    if (error) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.code === "NOT_FOUND" ? 404 : 500 }
      );
    }

    return NextResponse.json({
      podcast: {
        ...podcast,
        feedUrl,
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Invalid podcast ID or feed URL" },
      { status: 400 }
    );
  }
}
