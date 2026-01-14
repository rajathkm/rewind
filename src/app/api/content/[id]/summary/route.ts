import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { summarizeContent } from "@/lib/summarization/summarizer";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { id } = await params;

    const { data: { user } } = await supabase.auth.getUser();

    // Use admin client for development mode
    const db = user ? supabase : createAdminClient();

    // Get existing summary
    const { data: summary, error } = await db
      .from("summaries")
      .select("*")
      .eq("content_id", id)
      .single();

    if (error && error.code !== "PGRST116") {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (summary) {
      return NextResponse.json({ summary });
    }

    return NextResponse.json({ summary: null });
  } catch (error) {
    console.error("Error fetching summary:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { id } = await params;

    console.log(`[Summary API] POST /api/content/${id}/summary - Starting`);
    console.log(`[Summary API] OPENAI_API_KEY is ${process.env.OPENAI_API_KEY ? 'SET' : 'NOT SET'}`);

    const { data: { user } } = await supabase.auth.getUser();
    console.log(`[Summary API] User authenticated: ${!!user}`);

    // Use admin client for development mode
    const db = user ? supabase : createAdminClient();

    // Check if summary already exists
    const { data: existingSummary } = await db
      .from("summaries")
      .select("id")
      .eq("content_id", id)
      .single();

    if (existingSummary) {
      console.log(`[Summary API] Summary already exists for content ${id}`);
      return NextResponse.json(
        { error: "Summary already exists" },
        { status: 409 }
      );
    }

    // Get content item
    console.log(`[Summary API] Fetching content item ${id}`);
    const { data: content, error: contentError } = await db
      .from("content_items")
      .select(
        `
        id,
        title,
        extracted_text,
        transcript,
        content_type,
        duration_seconds,
        url,
        content_sources (
          source_type
        )
      `
      )
      .eq("id", id)
      .single();

    if (contentError) {
      console.error(`[Summary API] Content not found: ${contentError.message}`);
      return NextResponse.json({ error: "Content not found" }, { status: 404 });
    }

    console.log(`[Summary API] Content found:`, {
      id: content.id,
      title: content.title,
      content_type: content.content_type,
      hasExtractedText: !!content.extracted_text,
      extractedTextLength: content.extracted_text?.length || 0,
      hasTranscript: !!content.transcript,
      transcriptLength: content.transcript?.length || 0,
    });

    // Get content to summarize - prefer transcript for audio, otherwise use extracted_text
    const textContent = content.transcript || content.extracted_text;
    if (!textContent) {
      console.error(`[Summary API] No content available - both extracted_text and transcript are empty`);
      return NextResponse.json(
        { error: "No content available to summarize" },
        { status: 400 }
      );
    }

    console.log(`[Summary API] Using ${content.transcript ? 'transcript' : 'extracted_text'} for summarization (${textContent.length} chars)`);

    // Update processing status
    await db
      .from("content_items")
      .update({ processing_status: "processing" })
      .eq("id", id);

    // Get source type from the joined data
    const sourceType = (content.content_sources as any)?.source_type;

    // YouTube videos should use podcast summarization to get speakers and timestamps
    const isYouTubeVideo = content.content_type === "youtube_video";
    const usePodcastFormat = sourceType === "podcast" || isYouTubeVideo;

    try {
      // Generate summary
      console.log(`[Summary API] Calling summarizeContent with contentType=${usePodcastFormat ? 'podcast' : 'article'}`);
      const result = await summarizeContent(textContent, {
        title: content.title,
        contentType: usePodcastFormat ? "podcast" : "article",
        duration: content.duration_seconds,
      });

      console.log(`[Summary API] Summarization complete:`, {
        headline: result.summary.headline?.substring(0, 50),
        tokensUsed: result.tokensUsed,
        processingTimeMs: result.processingTimeMs,
        cost: result.cost,
      });

      // Store summary
      const { data: summary, error: insertError } = await db
        .from("summaries")
        .insert({
          content_id: id,
          summary_type: "detailed",
          headline: result.summary.headline,
          tldr: result.summary.tldr,
          full_summary: result.summary.fullSummary,
          key_points: result.summary.keyPoints,
          key_takeaways: result.summary.keyTakeaways,
          related_ideas: result.summary.relatedIdeas,
          allied_trivia: result.summary.alliedTrivia,
          model_used: "gpt-4o",
          tokens_used: {
            input: result.tokensUsed.input,
            output: result.tokensUsed.output,
          },
          processing_time_ms: result.processingTimeMs,
          quality_score: calculateQualityScore(result.summary),
        })
        .select()
        .single();

      if (insertError) {
        throw insertError;
      }

      // Update content processing status
      await db
        .from("content_items")
        .update({ processing_status: "completed" })
        .eq("id", id);

      return NextResponse.json({
        summary,
        cost: result.cost,
        tokensUsed: result.tokensUsed,
      });
    } catch (summarizeError) {
      console.error(`[Summary API] Summarization failed:`, summarizeError);
      // Update processing status to failed
      await db
        .from("content_items")
        .update({ processing_status: "failed" })
        .eq("id", id);

      throw summarizeError;
    }
  } catch (error) {
    console.error("[Summary API] Error generating summary:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to generate summary";
    console.error(`[Summary API] Returning error: ${errorMessage}`);
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

function calculateQualityScore(summary: any): number {
  let score = 0;

  // Headline quality (max 15)
  if (summary.headline?.length >= 20 && summary.headline?.length <= 100) {
    score += 15;
  } else if (summary.headline?.length > 0) {
    score += 8;
  }

  // TLDR quality (max 15)
  if (summary.tldr?.length >= 50 && summary.tldr?.length <= 500) {
    score += 15;
  } else if (summary.tldr?.length > 0) {
    score += 8;
  }

  // Full summary quality (max 20)
  if (summary.fullSummary?.length >= 200) {
    score += 20;
  } else if (summary.fullSummary?.length >= 100) {
    score += 12;
  }

  // Key takeaways (max 30)
  const takeawayCount = summary.keyTakeaways?.length || 0;
  score += Math.min(takeawayCount * 10, 30);

  // Related ideas (max 10)
  const ideaCount = summary.relatedIdeas?.length || 0;
  score += Math.min(ideaCount * 5, 10);

  // Trivia (max 10)
  const triviaCount = summary.alliedTrivia?.length || 0;
  score += Math.min(triviaCount * 5, 10);

  return Math.min(score, 100);
}
